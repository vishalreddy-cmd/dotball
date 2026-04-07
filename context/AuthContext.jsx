'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user,       setUser]       = useState(null);
  const [profile,    setProfile]    = useState(null);
  const [avatar,     setAvatar]     = useState(null);
  const [obDone,     setObDone]     = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (localStorage.getItem('ob_done')) setObDone(true);
      const av = localStorage.getItem('db_avatar');
      if (av) setAvatar(av);
    }

    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const name =
          fbUser.displayName ||
          (typeof window !== 'undefined' && localStorage.getItem('db_name')) ||
          fbUser.email?.split('@')[0] || '?';
        setUser(fbUser);
        setProfile({ name, uid: fbUser.uid });
        _loadChallenges(fbUser.uid);
      } else {
        setUser(null);
        setProfile(null);
        setChallenges([]);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function _loadChallenges(uid) {
    try {
      const q    = query(collection(db, 'challenges'), where('members', 'array-contains', uid));
      const snap = await getDocs(q);
      if (snap.docs.length) {
        setChallenges(snap.docs.map(d => ({ id: d.id, ...d.data(), own: d.data().owner === uid })));
      }
    } catch (e) { /* Firebase not available */ }
  }

  const finishOnboarding = () => {
    if (typeof window !== 'undefined') localStorage.setItem('ob_done', '1');
    setObDone(true);
  };

  const refreshChallenges = (uid) => _loadChallenges(uid || user?.uid);

  return (
    <AuthCtx.Provider value={{
      user, setUser,
      profile, setProfile,
      avatar, setAvatar,
      obDone, finishOnboarding,
      loading,
      challenges, setChallenges, refreshChallenges,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
