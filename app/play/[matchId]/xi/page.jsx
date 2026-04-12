'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSquad } from '@/lib/useSquad';
import { autoPick } from '@/lib/autoPick';
import { CR, ROLE_COLORS } from '@/lib/credits';
import { buildSchedule, isMatchLocked } from '@/lib/schedule';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { db } from '@/lib/firebase';
import { doc, setDoc, updateDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import PlayerCard from '@/components/PlayerCard';
import CreditBar from '@/components/CreditBar';
import RoleAssigner from '@/components/RoleAssigner';
import TeamLogo from '@/components/TeamLogo';
import ShareSquadCard from '@/components/ShareSquadCard';
import LiveSquadScore from '@/components/LiveSquadScore';
import data from '@/data/squads.json';

const T = data.teams;
const SQ = data.squads;

export default function XIPage() {
  const { matchId }  = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const cid          = searchParams.get('cid'); // challenge lobby to return to
  const { user, profile, challenges } = useAuth();
  const toast = useToast();

  const schedule = useMemo(() => buildSchedule(), []);
  const match    = schedule.find(m => m.id === matchId);

  const squad = useSquad();
  const { sel, C, VC, IP1, IP2, step, credits, remaining, roleCounts,
    overseasInXI, ipMustBeIndian,
    toggle, remove, setPicked, setCaptain, setViceCaptain, toggleImpact,
    goToRoles, reset, lockSquad, editSquad, loadSquad } = squad;

  const [teamFilter, setTeamFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [query,      setQuery]      = useState('');
  const [savedXI,    setSavedXI]    = useState(null);
  const [copXI,      setCopXI]      = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [ownership,  setOwnership]  = useState({}); // playerId -> pct
  const [showShare,  setShowShare]  = useState(false);
  const [lineup,     setLineup]     = useState(null); // { [playerId]: 'playing'|'impact'|'bench' }

  /* Load any existing saved squad */
  useEffect(() => {
    if (!user || !match) return;
    const key = `xi_${matchId}`;
    const local = sessionStorage.getItem(key);
    if (local) {
      try { setSavedXI(JSON.parse(local)); } catch (e) {}
    } else {
      getDoc(doc(db, 'squads', `${matchId}_${user.uid}_xi`)).then(snap => {
        if (snap.exists()) {
          const d = snap.data();
          const allPlayers = buildAllPlayers(match);
          setSavedXI(d);
          sessionStorage.setItem(key, JSON.stringify(d));
          loadSquad(d, allPlayers);
        }
      }).catch(() => {});
    }
  }, [user, match, matchId, loadSquad]);

  /* Mark 'marinating' in challenge lobby when coming from one */
  useEffect(() => {
    if (!cid || !user) return;
    updateDoc(doc(db, 'challenges', cid), {
      [`memberStatus.${user.uid}`]: 'marinating',
    }).catch(() => {});
  }, [cid, user?.uid]);

  /* Load ownership % — how many pickers selected each player */
  useEffect(() => {
    if (!matchId) return;
    async function loadOwnership() {
      try {
        const q = query(
          collection(db, 'squads'),
          where('matchId', '==', matchId),
          where('type', '==', 'xi')
        );
        const snap = await getDocs(q);
        if (snap.empty) return;
        const counts = {};
        snap.docs.forEach(d => {
          (d.data().players || []).forEach(pid => {
            counts[pid] = (counts[pid] || 0) + 1;
          });
        });
        const total = snap.size;
        const pct = {};
        Object.entries(counts).forEach(([pid, cnt]) => {
          pct[pid] = Math.round((cnt / total) * 100);
        });
        setOwnership(pct);
      } catch (e) { /* offline */ }
    }
    loadOwnership();
  }, [matchId]);

  /* Poll playing XI lineup — starts 1h before match, refreshes every 60s */
  useEffect(() => {
    if (!match) return;
    const matchTime = new Date(match.date).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    // Only poll if within 1 hour of start or already live/past
    if (match.status === 'upcoming' && matchTime - now > oneHour) return;

    const fetchLineup = () =>
      fetch(`/api/match-info?matchId=${matchId}`)
        .then(r => r.json())
        .then(d => { if (d.lineup) setLineup(d.lineup); })
        .catch(() => {});

    fetchLineup();
    if (match.status === 'live') {
      const id = setInterval(fetchLineup, 60_000);
      return () => clearInterval(id);
    }
  }, [matchId, match]);

  if (!match) return <div style={{ padding: 20, color: '#9a9590' }}>Match not found.</div>;

  function buildAllPlayers(m) {
    return [
      ...(SQ[m.t1] || []).map(p => ({ ...p, team: m.t1 })),
      ...(SQ[m.t2] || []).map(p => ({ ...p, team: m.t2 })),
    ];
  }

  const allPlayers = buildAllPlayers(match);

  const filtered   = allPlayers.filter(p =>
    (teamFilter === 'ALL' || p.team === teamFilter) &&
    (roleFilter === 'ALL' || p.r === roleFilter) &&
    (!query || p.n.toLowerCase().includes(query.toLowerCase()))
  );

  function handleToggle(player) {
    if (sel.some(s => s.id === player.id)) {
      remove(player.id);
      return;
    }
    const rc = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
    sel.forEach(s => rc[s.r]++);
    const maxs = { WK: 4, BAT: 6, BOWL: 6, AR: 4 };
    const mins = { WK: 1, BAT: 1, BOWL: 1, AR: 1 };
    if (rc[player.r] >= maxs[player.r]) { toast(`Max ${maxs[player.r]} ${player.r} players`, false); return; }
    const remaining2 = 10 - sel.length;
    if (player.r !== 'WK' && rc.WK === 0 && remaining2 <= 1) { toast('Must include at least 1 WK', false); return; }
    // Overseas limit: max 4 in playing XI
    if (player.c && player.c !== 'IN' && overseasInXI >= 4) { toast('Max 4 overseas players in XI (IPL rule)', false); return; }
    toggle(player, match.t1, match.t2);
  }

  function handleAutoPick() {
    const picked = autoPick(match, SQ);
    if (picked && picked.length === 11) {
      setPicked(picked);
      setCopXI(true); // dismiss the "load saved squad" prompt
      toast('Auto-picked XI! Tap a player chip to swap them out.');
    } else {
      toast('Could not auto-pick a valid XI — try manually', false);
    }
  }

  async function handleSave() {
    if (!user) return;
    if (isMatchLocked(match)) { toast('Match has started — squad is locked!', false); return; }
    setSaving(true);
    try {
      const squadData = {
        uid: user.uid, matchId, type: 'xi',
        name: profile?.name || 'Player',
        players: sel.map(p => p.id),
        captainId: C?.id || null,
        vcId: VC?.id || null,
        ip1Id: IP1?.id || null,
        ip2Id: IP2?.id || null,
        lockedAt: serverTimestamp(),
        revealed: false, points: 0,
      };
      await setDoc(doc(db, 'squads', `${matchId}_${user.uid}_xi`), squadData);
      sessionStorage.setItem(`xi_${matchId}`, JSON.stringify(squadData));

      // Mark status as 'ready' in all challenges for this match
      const myChallenges = (challenges || []).filter(ch => ch.matchId === matchId);
      if (myChallenges.length > 0) {
        await Promise.all(myChallenges.map(ch =>
          updateDoc(doc(db, 'challenges', ch.id), {
            [`memberStatus.${user.uid}`]: 'ready',
          }).catch(() => {})
        ));
      }

      toast('Squad saved to dotball!');
      if (cid) { router.push(`/challenge/${cid}`); return; }
    } catch (e) {
      toast(e.code === 'permission-denied' ? 'Firebase rules need updating — check console' : `Save failed: ${e.message}`, false);
    }
    setSaving(false);
  }

  function handleSetIP(id) {
    toggleImpact(id, sel, IP1, IP2);
  }

  /* ── DONE view ── */
  if (step === 'done') {
    const isLiveOrDone = match.status === 'live' || match.status === 'past';
    const myXIChallenges = (challenges || []).filter(ch => ch.matchId === matchId && ch.fmt === 'xi');

    return (
      <div style={{ padding: '12px 12px 0' }}>
        {/* Celebration card — only before match starts */}
        {!isLiveOrDone && (
          <div style={{ borderRadius: 16, padding: 18, background: 'linear-gradient(135deg,#0c1040,#1a0f30)', border: '1px solid #6366f144', marginBottom: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 38 }}>🎉</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#e8e6e0', marginTop: 4 }}>Squad locked!</div>
            <div style={{ fontSize: 11, color: '#22c55e', marginTop: 3 }}>Hidden from everyone until first ball</div>
            <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 10 }}>
              {[
                { v: sel.filter(p => p.team === match.t1).length, l: match.t1, c: T[match.t1]?.bg || '#6366f1' },
                { v: sel.filter(p => p.team === match.t2).length, l: match.t2, c: T[match.t2]?.bg || '#06b6d4' },
                { v: credits.toFixed(1), l: 'cr', c: '#f5a623' },
              ].map(x => (
                <div key={x.l} style={{ background: '#ffffff0a', borderRadius: 9, padding: '6px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: x.c }}>{x.v}</div>
                  <div style={{ fontSize: 9, color: '#9a9590' }}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Challenge banner — tells user which groups this XI counts for */}
        {!isLiveOrDone && myXIChallenges.length > 0 && (
          <div style={{ borderRadius: 12, padding: '10px 13px', background: '#0c1a10', border: '1px solid #22c55e33', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>
              ✅ This XI is locked in for {myXIChallenges.length === 1 ? 'your challenge' : `${myXIChallenges.length} challenges`}
            </div>
            {myXIChallenges.map(ch => (
              <div key={ch.id} style={{ fontSize: 10, color: '#86efac', marginTop: 2 }}>
                · {ch.name} <span style={{ color: '#5e5a56' }}>({ch.members?.length || 1} members)</span>
              </div>
            ))}
          </div>
        )}
        {!isLiveOrDone && myXIChallenges.length === 0 && (
          <div style={{ borderRadius: 12, padding: '10px 13px', background: '#2a2a2a', border: '1px solid #6366f133', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#a5b4fc' }}>Not in a challenge yet?</div>
              <div style={{ fontSize: 10, color: '#9a9590', marginTop: 2 }}>Create or join one — this XI counts automatically</div>
            </div>
            <button
              onClick={() => router.push('/groups')}
              style={{ padding: '6px 11px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              Go to groups
            </button>
          </div>
        )}

        {/* Live / post-match score view */}
        {isLiveOrDone ? (
          <LiveSquadScore
            matchId={matchId}
            players={sel}
            captainId={C?.id}
            vcId={VC?.id}
            ip1Id={IP1?.id}
            ip2Id={IP2?.id}
            match={match}
          />
        ) : (
          /* Pre-match: plain player list */
          sel.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 9, background: '#222222', border: `1px solid ${T[p.team]?.bg || '#6366f1'}44`, marginBottom: 4 }}>
              <TeamLogo team={p.team} size={22} />
              <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: '#e8e6e0' }}>{p.n}</div>
              {C?.id === p.id   && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#f59e0b', color: '#000', fontWeight: 800 }}>C</span>}
              {VC?.id === p.id  && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#818cf8', color: '#fff', fontWeight: 800 }}>VC</span>}
              {IP1?.id === p.id && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#34d399', color: '#000', fontWeight: 800 }}>IP1</span>}
              {IP2?.id === p.id && <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: '#34d399', color: '#000', fontWeight: 800 }}>IP2</span>}
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f5a623' }}>{(CR[p.id] || 7).toFixed(1)}</span>
            </div>
          ))
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={editSquad} style={{ flex: 1, padding: 11, borderRadius: 11, border: '1px solid #383838', background: 'transparent', color: '#9a9590', cursor: 'pointer', fontSize: 12 }}>Edit squad</button>
          <button onClick={() => setShowShare(true)} style={{ flex: 1, padding: 11, borderRadius: 11, border: '1px solid #383838', background: 'transparent', color: '#9a9590', cursor: 'pointer', fontSize: 12 }}>
            <div>Share squad</div>
            <div style={{ fontSize: 8, color: '#5e5a56', marginTop: 2 }}>reveals your picks</div>
          </button>
        </div>
        <button onClick={handleSave} disabled={saving} style={{ width: '100%', marginTop: 8, marginBottom: 12, padding: 12, borderRadius: 11, border: 'none', background: 'linear-gradient(90deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
          <div>{saving ? 'Saving...' : 'Save squad'}</div>
          {!saving && <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.85, marginTop: 2 }}>replicates for all challenges</div>}
        </button>
        {showShare && (
          <ShareSquadCard
            match={match}
            players={sel}
            C={C} VC={VC} IP1={IP1} IP2={IP2}
            onClose={() => setShowShare(false)}
          />
        )}
      </div>
    );
  }

  /* ── ROLES view ── */
  if (step === 'roles') {
    return (
      <RoleAssigner
        players={sel}
        C={C} VC={VC} IP1={IP1} IP2={IP2}
        onC={id => { setCaptain(id, sel); if (VC?.id === id) setViceCaptain(id, sel); }}
        onVC={id => { setViceCaptain(id, sel); if (C?.id === id) setCaptain(id, sel); }}
        onIP={handleSetIP}
        onLock={lockSquad}
        ipMustBeIndian={ipMustBeIndian}
      />
    );
  }

  /* ── PICK view ── */
  return (
    <div style={{ padding: '12px 12px 0' }}>
      {/* Match header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <TeamLogo team={match.t1} size={18} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#e8e6e0' }}>{match.t1}</span>
          <span style={{ color: '#5e5a56', fontSize: 9 }}>vs</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#e8e6e0' }}>{match.t2}</span>
          <TeamLogo team={match.t2} size={18} />
        </div>
        <div style={{ fontSize: 9, color: '#818cf8', background: '#383838', padding: '4px 8px', borderRadius: 7 }}>100 cr</div>
      </div>

      {/* Load saved squad prompt */}
      {savedXI && !copXI && step === 'pick' && sel.length === 0 && (
        <div style={{ borderRadius: 11, padding: '10px 12px', background: '#1c1040', border: '1px solid #6366f144', marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#a5b4fc', marginBottom: 3 }}>Load your saved squad?</div>
          <div style={{ fontSize: 10, color: '#9a9590', marginBottom: 8 }}>{savedXI.players?.length || 0} players saved — load and tweak.</div>
          <div style={{ display: 'flex', gap: 7 }}>
            <button onClick={() => { loadSquad(savedXI, allPlayers); setCopXI(true); }} style={{ flex: 2, padding: 8, borderRadius: 9, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 10, cursor: 'pointer' }}>Load squad</button>
            <button onClick={() => setCopXI(true)} style={{ flex: 1, padding: 8, borderRadius: 9, border: '1px solid #383838', background: 'transparent', color: '#9a9590', fontSize: 10, cursor: 'pointer' }}>Start fresh</button>
          </div>
        </div>
      )}

      <CreditBar spent={credits} selCount={sel.length} roleCounts={roleCounts} />

      {/* Overseas counter */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: overseasInXI >= 4 ? '#7c3aed22' : '#383838', color: overseasInXI >= 4 ? '#a78bfa' : '#5e5a56', border: `1px solid ${overseasInXI >= 4 ? '#7c3aed44' : '#383838'}` }}>
          {overseasInXI}/4 overseas
        </span>
      </div>

      {/* Auto pick — always visible so user can re-roll at any time */}
      <button onClick={handleAutoPick} style={{ width: '100%', padding: 10, borderRadius: 10, border: '1.5px solid #f59e0b44', background: '#f59e0b08', color: '#f5a623', fontWeight: 700, fontSize: 12, cursor: 'pointer', marginBottom: 8 }}>
        ⚡ {sel.length === 0 ? 'Auto Pick XI' : 'Re-pick XI'} (based on form)
      </button>

      {/* Selected chips */}
      {sel.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
          {sel.map(p => (
            <div
              key={p.id}
              onClick={() => remove(p.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer', background: `${T[p.team]?.bg || '#6366f1'}22`, border: `1px solid ${T[p.team]?.bg || '#6366f1'}55`, color: T[p.team]?.bg || '#6366f1' }}
            >
              {p.n.split(' ')[0]} <span style={{ opacity: 0.6 }}>×</span>
            </div>
          ))}
        </div>
      )}

      {/* Lineup banner — shows after toss */}
      {lineup && (
        <div style={{ borderRadius: 9, padding: '7px 10px', background: '#0c1a10', border: '1px solid #16a34a33', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>
            Toss done — Playing XI announced
          </div>
          <div style={{ display: 'flex', gap: 6, fontSize: 9, color: '#9a9590' }}>
            <span style={{ color: '#16a34a' }}>● Playing</span>
            <span style={{ color: '#7c3aed' }}>● Impact Sub</span>
            <span style={{ color: '#374151' }}>● Bench</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
        {['ALL', match.t1, match.t2].map(v => (
          <button key={v} onClick={() => setTeamFilter(v)} style={{ flex: 1, padding: '5px 3px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, background: teamFilter === v ? '#6366f1' : '#2a2a2a', color: teamFilter === v ? '#fff' : '#9a9590' }}>{v}</button>
        ))}
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ flex: 1, padding: 5, borderRadius: 9, border: '1px solid #383838', background: '#2a2a2a', color: '#9a9590', fontSize: 10 }}>
          {['ALL', 'WK', 'BAT', 'AR', 'BOWL'].map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      {/* Search */}
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search player..."
        style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: '1px solid #383838', background: '#2a2a2a', color: '#e8e6e0', fontSize: 11, outline: 'none', marginBottom: 8, fontFamily: 'inherit' }}
      />

      {/* Player list */}
      <div style={{ maxHeight: 275, overflowY: 'auto' }}>
        {filtered.map(p => {
          const isSel = sel.some(s => s.id === p.id);
          const cr    = CR[p.id] ?? 7;
          const tooExpensive  = cr > remaining + 0.01;
          const tooManyTeam   = sel.filter(s => s.team === p.team).length >= 6;
          const full          = sel.length >= 11;
          const dis = !isSel && (full || tooExpensive || tooManyTeam);
          return <PlayerCard key={p.id} player={p} selected={isSel} disabled={dis} onToggle={handleToggle} ownership={ownership[p.id]} playingStatus={lineup?.[p.id]} />;
        })}
      </div>

      {/* Proceed button */}
      <button
        onClick={goToRoles}
        disabled={sel.length !== 11}
        style={{
          width: '100%', marginTop: 10, padding: 13, borderRadius: 12, border: 'none',
          fontWeight: 700, fontSize: 13,
          cursor: sel.length === 11 ? 'pointer' : 'not-allowed',
          background: sel.length === 11 ? '#6366f1' : '#1e293b',
          color: sel.length === 11 ? '#fff' : '#475569',
        }}
      >
        {sel.length < 11 ? `Pick ${11 - sel.length} more` : 'Assign roles'}
      </button>
    </div>
  );
}
