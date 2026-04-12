'use client';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

const MAX_INR = 10000;
const MAX_USD = 100;
const CURRENCY_SYMBOL = { INR: '₹', USD: '$' };

const DISCLAIMER =
  'This is a friendly wager tracked by dotball for fun. ' +
  'dotball does not handle, hold, or transfer any money. ' +
  'Settlement happens entirely between participants outside the app.';

function fmt(currency, amount) {
  return `${CURRENCY_SYMBOL[currency] || ''}${amount.toLocaleString()}`;
}

export default function WagerCard({ challenge, matchId, myUid, myName, matchLocked }) {
  const [wager,      setWager]      = useState(undefined);
  const [matchNoResult, setMatchNoResult] = useState(false);
  const [mode,       setMode]       = useState(null);       // null | 'propose' | 'accept'
  const [currency,   setCurrency]   = useState('INR');
  const [amount,     setAmount]     = useState('');
  const [busy,       setBusy]       = useState(false);
  const [showDiscl,  setShowDiscl]  = useState(false);
  const [settled,    setSettled]    = useState(false);

  const wagerId = `wager_${challenge.id}`;

  useEffect(() => {
    if (!challenge?.id) return;
    const unsub = onSnapshot(doc(db, 'wagers', wagerId), snap => {
      setWager(snap.exists() ? snap.data() : null);
    });
    return () => unsub();
  }, [wagerId, challenge?.id]);

  useEffect(() => {
    if (!matchId) return;
    const unsub = onSnapshot(doc(db, 'liveCache', matchId), snap => {
      if (snap.exists()) setMatchNoResult(snap.data().payload?.matchNoResult || false);
    });
    return () => unsub();
  }, [matchId]);

  if (wager === undefined) return null; // still loading

  const isMember      = challenge.members?.includes(myUid);
  const myParticipant = wager?.participants?.find(p => p.uid === myUid);
  const hasAccepted   = !!myParticipant;
  const effectiveAmt  = wager ? Math.min(...wager.participants.map(p => p.stake)) : null;
  const totalPool     = wager ? wager.participants.reduce((s, p) => s + Math.min(p.stake, effectiveAmt), 0) : 0;
  const maxAmt        = currency === 'USD' ? MAX_USD : MAX_INR;

  async function propose() {
    const n = parseInt(amount, 10);
    if (!n || n < 1 || n > maxAmt) return;
    setBusy(true);
    try {
      await setDoc(doc(db, 'wagers', wagerId), {
        challengeId: challenge.id,
        matchId,
        currency,
        participants: [{ uid: myUid, name: myName, stake: n, acceptedAt: Date.now() }],
        status: 'open',
        winnerId: null,
        settledAt: null,
        createdAt: serverTimestamp(),
      });
      setMode(null); setAmount('');
    } catch (e) { console.error(e); }
    setBusy(false);
  }

  async function accept() {
    const n = parseInt(amount, 10);
    if (!n || n < 1 || n > maxAmt) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, 'wagers', wagerId), {
        participants: arrayUnion({ uid: myUid, name: myName, stake: n, acceptedAt: Date.now() }),
      });
      // Notify the wager proposer
      const proposerUid = wager?.participants?.[0]?.uid;
      if (proposerUid && proposerUid !== myUid) {
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uids: [proposerUid],
            title: `${myName} accepted your wager!`,
            body: `${wager.currency === 'INR' ? '₹' : '$'}${n.toLocaleString()} · ${challenge.name}`,
            url: '/groups',
          }),
        }).catch(() => {});
      }
      setMode(null); setAmount('');
    } catch (e) { console.error(e); }
    setBusy(false);
  }

  async function markSettled() {
    setBusy(true);
    try {
      await updateDoc(doc(db, 'wagers', wagerId), { status: 'settled', settledBy: myUid, settledAt: Date.now() });
      setSettled(true);
    } catch (e) { console.error(e); }
    setBusy(false);
  }

  // ── No wager yet ────────────────────────────────────────────────────────────
  if (!wager) {
    if (!isMember || matchLocked) return null;
    return (
      <div style={{ marginTop: 8 }}>
        {mode !== 'propose' ? (
          <button
            onClick={() => setMode('propose')}
            style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #f59e0b44', background: '#f59e0b08', color: '#f5a623', fontSize: 10, cursor: 'pointer' }}
          >
            💰 Place a wager
          </button>
        ) : (
          <div style={{ background: '#222222', border: '1px solid #f59e0b33', borderRadius: 12, padding: 12, marginTop: 4 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#e8e6e0', marginBottom: 8 }}>Propose a wager</div>

            {/* Currency */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {['INR', 'USD'].map(c => (
                <button key={c} onClick={() => { setCurrency(c); setAmount(''); }}
                  style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: currency === c ? '#f59e0b' : '#2a2a2a', color: currency === c ? '#000' : '#9a9590' }}>
                  {c === 'INR' ? '₹ INR' : '$ USD'}
                </button>
              ))}
            </div>

            {/* Amount */}
            <input
              type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder={`Amount (max ${currency === 'INR' ? '₹10,000' : '$100'})`}
              min={1} max={maxAmt}
              style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #383838', background: '#2a2a2a', color: '#f5a623', fontSize: 13, fontWeight: 700, boxSizing: 'border-box', outline: 'none', marginBottom: 8, fontFamily: 'inherit' }}
            />

            {/* Disclaimer */}
            <div style={{ fontSize: 9, color: '#5e5a56', marginBottom: 8, lineHeight: 1.5 }}>{DISCLAIMER}</div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={propose} disabled={busy || !amount || parseInt(amount) < 1 || parseInt(amount) > maxAmt}
                style={{ flex: 2, padding: 10, borderRadius: 9, border: 'none', background: '#f59e0b', color: '#000', fontWeight: 700, fontSize: 11, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? '...' : 'Propose wager'}
              </button>
              <button onClick={() => { setMode(null); setAmount(''); }}
                style={{ flex: 1, padding: 10, borderRadius: 9, border: '1px solid #383838', background: 'transparent', color: '#9a9590', fontSize: 11, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Wager exists ─────────────────────────────────────────────────────────────
  const isOpen     = wager.status === 'open';
  const isSettled  = wager.status === 'settled';
  const sym        = CURRENCY_SYMBOL[wager.currency] || '';
  const canAccept  = isMember && !hasAccepted && isOpen && !matchLocked;

  return (
    <div style={{ marginTop: 10, background: '#0d0e18', border: `1px solid ${isSettled ? '#22c55e44' : '#f59e0b33'}`, borderRadius: 12, padding: '10px 12px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13 }}>💰</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#f5a623' }}>
            Friendly wager · {wager.currency}
          </span>
        </div>
        <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 99, fontWeight: 700,
          background: matchNoResult ? '#383838' : isSettled ? '#14532d' : isOpen ? '#f59e0b18' : '#383838',
          color: matchNoResult ? '#9a9590' : isSettled ? '#86efac' : isOpen ? '#f5a623' : '#9a9590' }}>
          {matchNoResult ? '🌧 Void' : isSettled ? 'Settled' : isOpen && matchLocked ? 'Locked' : 'Open'}
        </span>
      </div>

      {/* Effective stake + pool */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, background: '#222222', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#f5a623' }}>{sym}{effectiveAmt?.toLocaleString()}</div>
          <div style={{ fontSize: 8, color: '#5e5a56' }}>stake each</div>
        </div>
        <div style={{ flex: 1, background: '#222222', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#22c55e' }}>{sym}{totalPool.toLocaleString()}</div>
          <div style={{ fontSize: 8, color: '#5e5a56' }}>total pool</div>
        </div>
        <div style={{ flex: 1, background: '#222222', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#a78bfa' }}>{wager.participants.length}</div>
          <div style={{ fontSize: 8, color: '#5e5a56' }}>in wager</div>
        </div>
      </div>

      {/* Prize breakdown */}
      {wager.participants.length >= 2 && (
        <div style={{ background: '#222222', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: '#9a9590', marginBottom: 4 }}>Prize breakdown</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
            <span style={{ color: '#f5a623' }}>1st place</span>
            <span style={{ color: '#f5a623', fontWeight: 700 }}>{sym}{(totalPool - effectiveAmt).toLocaleString()} profit</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 2 }}>
            <span style={{ color: '#9a9590' }}>2nd place</span>
            <span style={{ color: '#9a9590' }}>stake back (break even)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 2 }}>
            <span style={{ color: '#f87171' }}>3rd+</span>
            <span style={{ color: '#f87171' }}>lose stake</span>
          </div>
          {wager.participants.length === 2 && (
            <div style={{ fontSize: 9, color: '#6366f1', marginTop: 4 }}>2 players → winner takes all</div>
          )}
        </div>
      )}

      {/* Participants */}
      <div style={{ marginBottom: 8 }}>
        {wager.participants.map((p, i) => {
          const isMe = p.uid === myUid;
          const isLow = p.stake === effectiveAmt;
          return (
            <div key={p.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #38383844' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 10, color: isMe ? '#a5b4fc' : '#e8e6e0', fontWeight: isMe ? 700 : 400 }}>
                  {p.name}{isMe ? ' (you)' : ''}
                </span>
                {p.stake > effectiveAmt && (
                  <span style={{ fontSize: 8, color: '#9a9590' }}>offered {sym}{p.stake.toLocaleString()} → plays {sym}{effectiveAmt?.toLocaleString()}</span>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e' }}>✓ in</span>
            </div>
          );
        })}
      </div>

      {/* Accept / counter */}
      {canAccept && mode !== 'accept' && (
        <button onClick={() => setMode('accept')}
          style={{ width: '100%', padding: '8px 0', borderRadius: 8, border: '1px solid #22c55e44', background: '#14532d18', color: '#86efac', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
          Accept wager
        </button>
      )}

      {canAccept && mode === 'accept' && (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 10, color: '#9a9590', marginBottom: 6 }}>
            Enter your stake — lowest stake among all participants becomes the playing amount.
          </div>
          <input
            type="number" value={amount} onChange={e => setAmount(e.target.value)}
            placeholder={`Your stake (max ${wager.currency === 'INR' ? '₹10,000' : '$100'})`}
            min={1} max={wager.currency === 'INR' ? MAX_INR : MAX_USD}
            style={{ width: '100%', padding: '9px 10px', borderRadius: 8, border: '1px solid #383838', background: '#2a2a2a', color: '#22c55e', fontSize: 13, fontWeight: 700, boxSizing: 'border-box', outline: 'none', marginBottom: 6, fontFamily: 'inherit' }}
          />
          <div style={{ fontSize: 9, color: '#5e5a56', marginBottom: 8 }}>{DISCLAIMER}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={accept} disabled={busy || !amount || parseInt(amount) < 1}
              style={{ flex: 2, padding: 9, borderRadius: 8, border: 'none', background: '#22c55e', color: '#000', fontWeight: 700, fontSize: 11, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? '...' : 'Confirm'}
            </button>
            <button onClick={() => { setMode(null); setAmount(''); }}
              style={{ flex: 1, padding: 9, borderRadius: 8, border: '1px solid #383838', background: 'transparent', color: '#9a9590', fontSize: 11, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* No result — wager void */}
      {matchNoResult && (
        <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 10, color: '#9a9590', borderTop: '1px solid #383838', marginTop: 6 }}>
          🌧 Match abandoned — wager is void. No money changes hands.
        </div>
      )}

      {/* Settled state */}
      {isSettled && !matchNoResult && (
        <div style={{ textAlign: 'center', padding: '6px 0', fontSize: 10, color: '#86efac' }}>
          Marked as settled — thanks for playing fair!
        </div>
      )}

      {/* Mark settled button — show to any participant after match */}
      {hasAccepted && matchLocked && !isSettled && !matchNoResult && (
        <button onClick={markSettled} disabled={busy}
          style={{ width: '100%', padding: '7px 0', borderRadius: 8, border: '1px solid #22c55e33', background: 'transparent', color: '#22c55e', fontSize: 10, cursor: 'pointer', marginTop: 6, opacity: busy ? 0.6 : 1 }}>
          Mark as settled (paid outside app)
        </button>
      )}

      {/* Disclaimer toggle */}
      <button onClick={() => setShowDiscl(o => !o)}
        style={{ background: 'transparent', border: 'none', color: '#5e5a56', fontSize: 8, cursor: 'pointer', marginTop: 4, padding: 0 }}>
        {showDiscl ? '▲ hide disclaimer' : 'ⓘ disclaimer'}
      </button>
      {showDiscl && (
        <div style={{ fontSize: 8, color: '#5e5a56', lineHeight: 1.5, marginTop: 4 }}>{DISCLAIMER}</div>
      )}
    </div>
  );
}
