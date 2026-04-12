'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { auth, db } from '@/lib/firebase';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { BADGE_DEFS, computeBadges } from '@/lib/badges';

export default function ProfilePage() {
  const { user, profile, setProfile, avatar, setAvatar, challenges } = useAuth();
  const toast = useToast();
  const [editing,  setEditing]  = useState(false);
  const [newName,  setNewName]  = useState(profile?.name || '');
  const [stats,    setStats]    = useState(null);
  const [badges,   setBadges]   = useState([]);

  /* Load user stats from Firestore */
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        const s = d.stats || {};
        setStats(s);
        setBadges(computeBadges(s));
      }
    }).catch(() => {});
  }, [user]);

  async function handleSignOut() {
    try { await signOut(auth); } catch (e) {}
    localStorage.removeItem('db_name');
    localStorage.removeItem('db_uid');
    localStorage.removeItem('db_avatar');
    window.location.href = '/';
  }

  async function saveName() {
    const n = newName.trim();
    if (n.length < 2) { toast('Name must be at least 2 characters', false); return; }
    try {
      await updateProfile(user, { displayName: n });
      await updateDoc(doc(db, 'users', user.uid), { name: n });
      setProfile(p => ({ ...p, name: n }));
      localStorage.setItem('db_name', n);
      toast('Display name updated!');
      setEditing(false);
    } catch (e) { toast(`Failed: ${e.message}`, false); }
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { toast('Image too large — use something under 500 KB', false); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);
      localStorage.setItem('db_avatar', dataUrl);
      toast('Avatar updated!');
    };
    reader.readAsDataURL(file);
  }

  async function requestNotifPerm() {
    if (!('Notification' in window)) { toast('Notifications not supported in this browser', false); return; }
    const perm = await Notification.requestPermission();
    toast(perm === 'granted' ? 'Notifications enabled! 🔔' : 'Notifications blocked.', perm === 'granted');
  }

  const initials = (profile?.name || '?').substring(0, 2).toUpperCase();

  const statItems = [
    ['🏆', 'Season rank',       stats?.seasonRank ? `#${stats.seasonRank}` : '—'],
    ['💯', 'Best score',        stats?.bestScore ? `${stats.bestScore} pts` : '—'],
    ['🔥', 'Longest streak',    stats?.maxStreak ? `${stats.maxStreak} wins` : '—'],
    ['🎯', 'Current streak',    stats?.currentStreak ? `${stats.currentStreak} wins` : '—'],
    ['🏏', 'Matches played',    stats?.matches ? `${stats.matches}` : '—'],
    ['🤝', 'Challenges joined', `${challenges.length}`],
  ];

  const lockedBadges = BADGE_DEFS.filter(b => !badges.find(earned => earned.id === b.id));

  return (
    <div style={{ padding: '22px 14px 0' }}>
      {/* Avatar + name */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', width: 76, height: 76, margin: '0 auto 12px' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '3px solid #6366f155' }}>
            {avatar
              ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : <span style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{initials}</span>}
          </div>
          <label htmlFor="av-up" style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #08090f', fontSize: 11 }}>
            ✎
          </label>
          <input id="av-up" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {editing ? (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #6366f1', background: '#0d0f1a', color: '#eef0ff', fontSize: 14, fontWeight: 700, outline: 'none', fontFamily: 'inherit', maxWidth: 160 }}
              autoFocus
            />
            <button onClick={saveName} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Save</button>
            <button onClick={() => { setEditing(false); setNewName(profile?.name || ''); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #1c2035', background: 'transparent', color: '#7a85a0', fontSize: 11, cursor: 'pointer' }}>Cancel</button>
          </div>
        ) : (
          <div style={{ fontSize: 18, fontWeight: 700, color: '#eef0ff' }}>{profile?.name || '—'}</div>
        )}

        <div style={{ fontSize: 11, color: '#7a85a0', marginTop: 2 }}>dotball · IPL 2026</div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{ marginTop: 8, padding: '5px 14px', borderRadius: 99, border: '1px solid #1c2035', background: 'transparent', color: '#7a85a0', fontSize: 10, cursor: 'pointer' }}>
            Edit display name
          </button>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 16 }}>
        {statItems.map(([icon, key, val]) => (
          <div key={key} style={{ padding: '10px 8px', borderRadius: 11, background: '#111421', border: '1px solid #1c2035', textAlign: 'center' }}>
            <div style={{ fontSize: 16, marginBottom: 3 }}>{icon}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#eef0ff' }}>{val}</div>
            <div style={{ fontSize: 8, color: '#424960', marginTop: 2, lineHeight: 1.3 }}>{key}</div>
          </div>
        ))}
      </div>

      {/* Badges earned */}
      {badges.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#eef0ff', marginBottom: 8 }}>Badges earned</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {badges.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 99, background: `${b.color}18`, border: `1px solid ${b.color}44` }}>
                <span style={{ fontSize: 14 }}>{b.icon}</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: b.color }}>{b.label}</div>
                  <div style={{ fontSize: 8, color: '#7a85a0' }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Locked badges */}
      {lockedBadges.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#424960', marginBottom: 8 }}>Locked badges</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {lockedBadges.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 99, background: '#111421', border: '1px solid #1c2035', opacity: 0.5 }}>
                <span style={{ fontSize: 14, filter: 'grayscale(1)' }}>{b.icon}</span>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#424960' }}>{b.label}</div>
                  <div style={{ fontSize: 8, color: '#424960' }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <button onClick={requestNotifPerm} style={{ width: '100%', padding: 12, borderRadius: 11, border: '1px solid #6366f133', background: '#6366f108', color: '#818cf8', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
        🔔 Enable match notifications
      </button>
      <button onClick={handleSignOut} style={{ width: '100%', padding: 12, borderRadius: 11, border: '1px solid #ef444433', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
        Sign out
      </button>
    </div>
  );
}
