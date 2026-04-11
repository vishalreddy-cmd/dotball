'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { buildSchedule, isMatchLocked } from '@/lib/schedule';
import HeadToHead from '@/components/HeadToHead';
import WagerCard from '@/components/WagerCard';
import data from '@/data/squads.json';

// Separate code pools per format
const XI_CODES = data.codesXI;
const R3_CODES = data.codesR3;
const genCode = (fmt) => {
  const pool = fmt === 'r3' ? R3_CODES : XI_CODES;
  return pool[Math.floor(Math.random() * pool.length)];
};
const codeInfo = (code) =>
  [...XI_CODES, ...R3_CODES].find(c => c.w === code);

const docId = (code, fmt) => `${fmt}_${code}`;

// Status config
const STATUS = {
  ready:   { dot: '#22c55e', label: 'Squad locked',   icon: '🟢' },
  pending: { dot: '#ef4444', label: 'Yet to pick',    icon: '🔴' },
};

function MemberLobby({ challenge, statuses, myUid }) {
  const members     = challenge.members     || [];
  const memberNames = challenge.memberNames || [];
  const memberStatus = statuses[challenge.id] || {};

  const readyCount = members.filter(uid => memberStatus[uid] === 'ready').length;

  return (
    <div style={{ marginTop: 10, borderRadius: 10, background: '#0d0f1a', border: '1px solid #1c2035', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 11px', borderBottom: '1px solid #1c2035' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#7a85a0' }}>Squad status</span>
        <span style={{ fontSize: 10, color: readyCount === members.length ? '#22c55e' : '#f59e0b', fontWeight: 700 }}>
          {readyCount}/{members.length} ready
        </span>
      </div>
      {/* Member rows */}
      {members.map((uid, i) => {
        const name   = memberNames[i] || 'Player';
        const status = memberStatus[uid] === 'ready' ? STATUS.ready : STATUS.pending;
        const isMe   = uid === myUid;
        return (
          <div
            key={uid}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 11px',
              borderBottom: i < members.length - 1 ? '1px solid #1c203566' : 'none',
              background: isMe ? '#6366f108' : 'transparent',
            }}
          >
            {/* Avatar circle */}
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: isMe ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#1c2035',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: isMe ? '#fff' : '#7a85a0', flexShrink: 0,
            }}>
              {name.substring(0, 2).toUpperCase()}
            </div>
            {/* Name */}
            <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#eef0ff' }}>
              {name}{isMe && <span style={{ fontSize: 9, color: '#818cf8', marginLeft: 4 }}>you</span>}
            </div>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: status.dot, display: 'inline-block' }} />
              <span style={{ fontSize: 9, color: status.dot, fontWeight: 600 }}>{status.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GroupsPage() {
  const { user, profile, challenges, setChallenges } = useAuth();
  const toast  = useToast();
  const router = useRouter();

  const schedule    = useMemo(() => buildSchedule(), []);
  const activeMatch = useMemo(() =>
    schedule.find(m => m.status === 'live') ||
    schedule.find(m => m.status === 'next') ||
    schedule.find(m => m.status === 'future'),
  [schedule]);

  const [mode,       setMode]       = useState(null);
  const [chName,     setChName]     = useState('');
  const [chFmt,      setChFmt]      = useState('xi');
  const [chCode,     setChCode]     = useState('');
  const [defOpen,    setDefOpen]    = useState(null);
  const [busy,       setBusy]       = useState(false);
  const [shareInfo,  setShareInfo]  = useState(null);
  const [copied,     setCopied]     = useState(false);
  const [h2hChallenge, setH2hChallenge] = useState(null);
  const [lobbyOpen,  setLobbyOpen]  = useState(null); // challengeId that has lobby expanded
  const [statuses,   setStatuses]   = useState({}); // { [challengeId]: { [uid]: 'ready'|'pending' } }

  const activeChallenges = activeMatch
    ? challenges.filter(ch => ch.matchId === activeMatch.id)
    : challenges;

  // Subscribe to each challenge doc for live member status
  useEffect(() => {
    if (!activeChallenges.length) return;
    const unsubs = activeChallenges.map(ch =>
      onSnapshot(doc(db, 'challenges', ch.id), snap => {
        if (snap.exists()) {
          const d = snap.data();
          setStatuses(prev => ({
            ...prev,
            [ch.id]: d.memberStatus || {},
          }));
        }
      })
    );
    return () => unsubs.forEach(u => u());
  }, [activeChallenges.length, activeMatch?.id]);

  async function createChallenge() {
    if (!chName.trim())  { toast('Enter a challenge name', false); return; }
    if (!user)           { toast('Please sign in first', false); return; }
    if (!activeMatch)    { toast('No upcoming match found', false); return; }
    setBusy(true);
    const ci = genCode(chFmt);
    const id = docId(ci.w, chFmt);
    try {
      await setDoc(doc(db, 'challenges', id), {
        name: chName.trim(), code: ci.w, fmt: chFmt,
        matchId: activeMatch.id,
        matchLabel: `${activeMatch.t1} vs ${activeMatch.t2}`,
        owner: user.uid, ownerName: profile?.name || 'Player',
        members: [user.uid], memberNames: [profile?.name || 'Player'],
        memberStatus: { [user.uid]: 'pending' },
        createdAt: serverTimestamp(),
      });
      const newCh = {
        id, name: chName.trim(), code: ci.w, fmt: chFmt,
        matchId: activeMatch.id,
        matchLabel: `${activeMatch.t1} vs ${activeMatch.t2}`,
        members: [user.uid], memberNames: [profile?.name || 'Player'],
        own: true,
      };
      setChallenges(prev => [...prev, newCh]);
      setShareInfo({ code: ci.w, fmt: chFmt, def: ci.d, name: chName.trim() });
      setChName(''); setMode(null);
    } catch (e) { toast(`Failed: ${e.message}`, false); }
    setBusy(false);
  }

  async function joinChallenge() {
    const code = chCode.trim().toUpperCase();
    if (code.length < 4) { toast('Enter a valid challenge code', false); return; }
    if (!user)           { toast('Please sign in first', false); return; }

    const ids = [docId(code, 'xi'), docId(code, 'r3')];
    setBusy(true);
    try {
      let found = null;
      for (const id of ids) {
        if (challenges.some(c => c.id === id)) {
          toast("You're already in this challenge!", false); setBusy(false); return;
        }
        const snap = await getDoc(doc(db, 'challenges', id));
        if (snap.exists()) { found = { id, ...snap.data() }; break; }
      }
      if (!found) { toast('Challenge not found — check the code', false); setBusy(false); return; }

      await updateDoc(doc(db, 'challenges', found.id), {
        members:      arrayUnion(user.uid),
        memberNames:  arrayUnion(profile?.name || 'Player'),
        [`memberStatus.${user.uid}`]: 'pending',
      });
      setChallenges(prev => [...prev, { ...found, own: false }]);
      setChCode(''); setMode(null);
      toast(`Joined ${found.name}! Pick your squad now`);
      if (found.matchId) {
        router.push(`/play/${found.matchId}/${found.fmt === 'r3' ? 'r3' : 'xi'}`);
      }
    } catch (e) { toast(`Failed to join: ${e.message}`, false); }
    setBusy(false);
  }

  function shareWhatsApp(code, name) {
    const text = `Join my dotball challenge "${name}" for ${activeMatch?.t1} vs ${activeMatch?.t2}!\nCode: ${code}\nOpen: ${window.location.origin}/groups`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  async function copyCode(code) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { toast('Could not copy — try manually', false); }
  }

  return (
    <div style={{ padding: '12px 12px 0' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#eef0ff', marginBottom: 3 }}>My challenges</div>
      <div style={{ fontSize: 11, color: '#7a85a0', marginBottom: activeMatch ? 4 : 16 }}>
        Compete in multiple groups — same squad, picks apply everywhere.
      </div>

      {/* Active match context */}
      {activeMatch && (
        <div style={{ fontSize: 10, color: '#818cf8', background: '#6366f108', border: '1px solid #6366f133', borderRadius: 8, padding: '5px 10px', marginBottom: 14 }}>
          Challenges below are for <strong style={{ color: '#a5b4fc' }}>{activeMatch.t1} vs {activeMatch.t2}</strong> · {activeMatch.day} {activeMatch.date}
        </div>
      )}

      {/* Share panel */}
      {shareInfo && (
        <div style={{ background: 'linear-gradient(135deg,#0c1040,#1a0f30)', border: '1px solid #6366f144', borderRadius: 14, padding: 15, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#7a85a0', letterSpacing: 0.5, marginBottom: 10 }}>
            Challenge created! Share this code
          </div>
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 8, fontFamily: 'Georgia,serif', color: '#f5a623', marginBottom: 4 }}>
              {shareInfo.code}
            </div>
            <div style={{ fontSize: 10, color: shareInfo.fmt === 'r3' ? '#06b6d4' : '#818cf8' }}>
              {shareInfo.fmt === 'r3' ? 'Top 3' : 'Classic XI'} challenge
            </div>
            {shareInfo.def && (
              <div style={{ fontSize: 10, color: '#424960', marginTop: 6, fontStyle: 'italic', lineHeight: 1.5 }}>
                "{shareInfo.def}"
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <button
              onClick={() => shareWhatsApp(shareInfo.code, shareInfo.name)}
              style={{ width: '100%', padding: 11, borderRadius: 10, border: 'none', background: '#25D366', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
            >
              📤 Share via WhatsApp
            </button>
            <button
              onClick={() => copyCode(shareInfo.code)}
              style={{ width: '100%', padding: 11, borderRadius: 10, border: `1px solid ${copied ? '#22c55e' : '#1c2035'}`, background: copied ? '#14532d18' : 'transparent', color: copied ? '#86efac' : '#7a85a0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            >
              {copied ? '✓ Copied!' : 'Copy code'}
            </button>
            <button onClick={() => setShareInfo(null)} style={{ background: 'transparent', border: 'none', color: '#424960', fontSize: 11, cursor: 'pointer' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Challenge list */}
      {activeChallenges.length > 0 ? activeChallenges.map(ch => {
        const memberStatus = statuses[ch.id] || {};
        const readyCount   = (ch.members || []).filter(uid => memberStatus[uid] === 'ready').length;
        const total        = ch.members?.length || 1;
        const allReady     = readyCount === total && total > 1;
        const isLobbyOpen  = lobbyOpen === ch.id;

        return (
          <div key={ch.id} style={{ background: '#111421', border: '1px solid #1c2035', borderRadius: 14, padding: '12px 13px', marginBottom: 9 }}>
            {/* Top row */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {ch.own ? '👑' : '🤝'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#eef0ff' }}>{ch.name}</div>
                <div style={{ fontSize: 10, color: '#7a85a0' }}>{ch.fmt === 'xi' ? 'Classic XI' : 'Top 3'} · {total} member{total !== 1 ? 's' : ''}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 4, fontFamily: 'Georgia,serif', color: '#f5a623' }}>{ch.code}</div>
                  <button
                    onClick={() => setDefOpen(defOpen === ch.id ? null : ch.id)}
                    style={{ width: 18, height: 18, borderRadius: '50%', background: defOpen === ch.id ? '#6366f1' : '#0d0f1a', border: `1px solid ${defOpen === ch.id ? '#6366f1' : '#1c2035'}`, color: defOpen === ch.id ? '#fff' : '#424960', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >i</button>
                </div>
                {defOpen === ch.id && codeInfo(ch.code) && (
                  <div style={{ background: '#0d0f1a', border: '1px solid #1c2035', borderRadius: 8, padding: '8px 10px', marginTop: 6, fontSize: 10, color: '#818cf8', lineHeight: 1.5 }}>
                    <strong style={{ color: '#a5b4fc' }}>{ch.code}</strong> — {codeInfo(ch.code).d}
                  </div>
                )}
              </div>
              {ch.own && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, background: '#6366f118', color: '#818cf8', border: '1px solid #6366f133', fontWeight: 700, flexShrink: 0 }}>Owner</span>}
            </div>

            {/* Ready count pill + lobby toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              {/* Ready pill */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 9px', borderRadius: 99,
                  background: allReady ? '#14532d22' : '#1c2035',
                  border: `1px solid ${allReady ? '#22c55e44' : '#1c2035'}`,
                  cursor: 'pointer',
                }}
                onClick={() => setLobbyOpen(isLobbyOpen ? null : ch.id)}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: allReady ? '#22c55e' : readyCount > 0 ? '#f59e0b' : '#ef4444' }} />
                <span style={{ fontSize: 9, color: allReady ? '#22c55e' : readyCount > 0 ? '#f59e0b' : '#ef4444', fontWeight: 700 }}>
                  {readyCount}/{total} squads ready
                </span>
                <span style={{ fontSize: 9, color: '#424960' }}>{isLobbyOpen ? '▲' : '▼'}</span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
                {ch.own && (
                  <button
                    onClick={() => { const info = codeInfo(ch.code); setShareInfo({ code: ch.code, fmt: ch.fmt, def: info?.d, name: ch.name }); setCopied(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #6366f133', background: '#6366f108', color: '#818cf8', fontSize: 10, cursor: 'pointer' }}
                  >
                    Share
                  </button>
                )}
                {total > 1 && (
                  <button
                    onClick={() => setH2hChallenge(ch)}
                    style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #06b6d433', background: '#06b6d408', color: '#06b6d4', fontSize: 10, cursor: 'pointer' }}
                  >
                    ⚔ Compare
                  </button>
                )}
              </div>
            </div>

            {/* Challenge lobby — expandable */}
            {isLobbyOpen && (
              <MemberLobby
                challenge={ch}
                statuses={statuses}
                myUid={user?.uid}
              />
            )}

            {/* Wager card */}
            <WagerCard
              challenge={ch}
              matchId={activeMatch?.id}
              myUid={user?.uid}
              myName={profile?.name || 'Player'}
              matchLocked={activeMatch ? isMatchLocked(activeMatch) : false}
            />
          </div>
        );
      }) : (
        <div style={{ background: '#111421', border: '1px solid #1c2035', borderRadius: 14, padding: 20, textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🤝</div>
          <div style={{ fontSize: 12, color: '#7a85a0' }}>
            {activeMatch
              ? `No challenge yet for ${activeMatch.t1} vs ${activeMatch.t2}. Create one or join a friend's!`
              : "No challenges yet. Create one or join a friend's!"}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!mode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={() => setMode('create')} style={{ width: '100%', padding: 13, borderRadius: 12, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            + Create a challenge
          </button>
          <button onClick={() => setMode('join')} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1.5px solid #06b6d4', background: 'transparent', color: '#06b6d4', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Enter a code to join
          </button>
        </div>
      )}

      {/* Create form */}
      {mode === 'create' && (
        <div style={{ background: '#111421', border: '1px solid #1c2035', borderRadius: 14, padding: 15 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#eef0ff', marginBottom: 4 }}>New challenge</div>
          {activeMatch && (
            <div style={{ fontSize: 10, color: '#7a85a0', marginBottom: 10 }}>
              For <strong style={{ color: '#a5b4fc' }}>{activeMatch.t1} vs {activeMatch.t2}</strong> · {activeMatch.day} {activeMatch.date}
            </div>
          )}
          <input
            value={chName} onChange={e => setChName(e.target.value)}
            placeholder="Name (e.g. Office Mates)"
            style={{ width: '100%', padding: '10px 11px', borderRadius: 9, border: '1px solid #1c2035', background: '#0d0f1a', color: '#eef0ff', fontSize: 13, boxSizing: 'border-box', outline: 'none', marginBottom: 10, fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button onClick={() => setChFmt('xi')} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: chFmt === 'xi' ? '#6366f1' : '#0d0f1a', color: chFmt === 'xi' ? '#fff' : '#7a85a0' }}>Classic XI</button>
            <button onClick={() => setChFmt('r3')} style={{ flex: 1, padding: 9, borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: chFmt === 'r3' ? '#06b6d4' : '#0d0f1a', color: chFmt === 'r3' ? '#fff' : '#7a85a0' }}>Top 3</button>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={createChallenge} disabled={busy} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Creating...' : 'Create & get code'}
            </button>
            <button onClick={() => setMode(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #1c2035', background: 'transparent', color: '#7a85a0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Join form */}
      {mode === 'join' && (
        <div style={{ background: '#111421', border: '1px solid #1c2035', borderRadius: 14, padding: 15 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#eef0ff', marginBottom: 4 }}>Enter challenge code</div>
          <div style={{ fontSize: 11, color: '#7a85a0', marginBottom: 10 }}>Works for both Classic XI and Top 3 challenges</div>
          <input
            value={chCode}
            onChange={e => setChCode(e.target.value.toUpperCase())}
            placeholder="e.g. GOOGLY"
            maxLength={12}
            style={{ width: '100%', padding: 12, borderRadius: 9, border: '1px solid #1c2035', background: '#0d0f1a', color: '#f5a623', fontSize: 20, fontWeight: 800, letterSpacing: 6, textAlign: 'center', boxSizing: 'border-box', outline: 'none', marginBottom: 10, fontFamily: 'Georgia,serif' }}
          />
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={joinChallenge} disabled={busy || chCode.length < 4} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: chCode.length >= 4 ? '#6366f1' : '#1e293b', color: chCode.length >= 4 ? '#fff' : '#475569', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? 'Joining...' : 'Join'}
            </button>
            <button onClick={() => setMode(null)} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #1c2035', background: 'transparent', color: '#7a85a0', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {activeChallenges.length > 1 && !mode && (
        <div style={{ borderRadius: 11, padding: '10px 12px', background: '#6366f108', border: '1px solid #6366f133', marginTop: 12, fontSize: 11, color: '#818cf8', lineHeight: 1.6 }}>
          Same squad, multiple groups — lock once and it counts everywhere.
        </div>
      )}

      {/* Head-to-head sheet */}
      {h2hChallenge && (
        <HeadToHead
          challenge={h2hChallenge}
          matchId={activeMatch?.id}
          myUid={user?.uid}
          onClose={() => setH2hChallenge(null)}
        />
      )}
    </div>
  );
}
