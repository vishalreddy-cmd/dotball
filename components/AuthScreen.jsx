'use client';
import { useState } from 'react';
import { auth, db } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  updateProfile, sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const ERR_MAP = {
  'auth/email-already-in-use':  'This email is already registered. Try signing in instead.',
  'auth/invalid-email':         'Please enter a valid email address.',
  'auth/weak-password':         'Password must be at least 6 characters.',
  'auth/user-not-found':        'No account found with this email. Try signing up.',
  'auth/wrong-password':        'Incorrect password. Try again or reset it.',
  'auth/invalid-credential':    'Incorrect email or password.',
  'auth/too-many-requests':     'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed':'Network error. Check your connection and try again.',
};
const authErr = (code) => ERR_MAP[code] || 'Something went wrong. Please try again.';

export default function AuthScreen() {
  const { setUser, setProfile, refreshChallenges } = useAuth();
  const toast = useToast();
  const [step,    setStep]    = useState('login'); // login | signup | reset
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [pass,    setPass]    = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function doLogin() {
    if (!email.includes('@')) { setError('Please enter a valid email address'); return; }
    if (!pass) { setError('Please enter your password'); return; }
    setError(''); setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const n = cred.user.displayName || email.split('@')[0];
      setUser(cred.user);
      setProfile({ name: n, uid: cred.user.uid });
      localStorage.setItem('db_name', n);
      localStorage.setItem('db_uid', cred.user.uid);
      refreshChallenges(cred.user.uid);
      toast(`Welcome back, ${n}! 🏏`);
    } catch (e) { setError(authErr(e.code)); }
    setLoading(false);
  }

  async function doSignup() {
    if (name.trim().length < 2) { setError('Display name must be at least 2 characters'); return; }
    if (!email.includes('@'))   { setError('Please enter a valid email address'); return; }
    if (pass.length < 6)        { setError('Password must be at least 6 characters'); return; }
    setError(''); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name.trim() });
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: name.trim(), uid: cred.user.uid, email, createdAt: serverTimestamp(),
      }, { merge: true });
      setUser(cred.user);
      setProfile({ name: name.trim(), uid: cred.user.uid });
      localStorage.setItem('db_name', name.trim());
      localStorage.setItem('db_uid', cred.user.uid);
      toast(`Welcome to dotball, ${name.trim()}! 🏏`);
    } catch (e) { setError(authErr(e.code)); }
    setLoading(false);
  }

  async function doReset() {
    if (!email.includes('@')) { setError('Please enter your email address'); return; }
    setError(''); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast(`Reset link sent to ${email}! Check your inbox.`);
      setStep('login');
    } catch (e) { setError(authErr(e.code)); }
    setLoading(false);
  }

  const inputStyle = {
    width: '100%', padding: 13, borderRadius: 11, border: '1px solid #383838',
    background: '#2a2a2a', color: '#e8e6e0', fontSize: 14, marginBottom: 10,
    boxSizing: 'border-box', outline: 'none', WebkitAppearance: 'none', fontFamily: 'inherit',
  };
  const btnPrimary = {
    width: '100%', padding: 14, borderRadius: 12, border: 'none',
    background: loading ? '#1e293b' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
    WebkitAppearance: 'none', opacity: loading ? 0.6 : 1,
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 20, overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#e8e6e0', display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />
          dotball
        </div>
        <div style={{ fontSize: 9, color: '#5e5a56', letterSpacing: 3, marginTop: 5 }}>IPL 2026 FANTASY</div>
      </div>

      <div style={{ width: '100%', maxWidth: 340, background: '#222222', borderRadius: 18, padding: '24px 20px', border: '1px solid #383838' }}>
        {step === 'reset' ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#e8e6e0', marginBottom: 4 }}>Reset password</div>
            <div style={{ fontSize: 12, color: '#9a9590', marginBottom: 18 }}>We'll send a reset link to your email</div>
            {error && <div style={{ fontSize: 11, color: '#fca5a5', background: '#450a0a', border: '1px solid #ef444444', padding: '8px 10px', borderRadius: 8, marginBottom: 12 }}>{error}</div>}
            <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <button style={btnPrimary} onClick={doReset} disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
            <button onClick={() => { setStep('login'); setError(''); }} style={{ marginTop: 14, background: 'transparent', border: 'none', color: '#818cf8', fontSize: 12, cursor: 'pointer', width: '100%', textAlign: 'center' }}>
              ← Back to login
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#e8e6e0', marginBottom: 4 }}>
              {step === 'signup' ? 'Create your account' : 'Welcome back'}
            </div>
            <div style={{ fontSize: 12, color: '#9a9590', marginBottom: 18 }}>
              {step === 'signup' ? 'Sign up to start playing' : 'Sign in to continue'}
            </div>
            {error && <div style={{ fontSize: 11, color: '#fca5a5', background: '#450a0a', border: '1px solid #ef444444', padding: '8px 10px', borderRadius: 8, marginBottom: 12 }}>{error}</div>}

            {step === 'signup' && (
              <input style={inputStyle} type="text" autoCapitalize="words" placeholder="Display name (e.g. CricketKing99)"
                value={name} onChange={e => setName(e.target.value)} />
            )}
            <input style={inputStyle} type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} />
            <input
              style={{ ...inputStyle, marginBottom: step === 'signup' ? 12 : 6 }}
              type="password"
              placeholder={step === 'signup' ? 'Create password (min 6 chars)' : 'Password'}
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') step === 'signup' ? doSignup() : doLogin(); }}
            />

            {step === 'login' && (
              <div style={{ textAlign: 'right', marginBottom: 14 }}>
                <button onClick={() => { setStep('reset'); setError(''); }} style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: 11, cursor: 'pointer', padding: 0 }}>
                  Forgot password?
                </button>
              </div>
            )}

            <button style={btnPrimary} onClick={step === 'signup' ? doSignup : doLogin} disabled={loading}>
              {loading
                ? (step === 'signup' ? 'Creating account...' : 'Signing in...')
                : (step === 'signup' ? 'Create account' : 'Sign in')}
            </button>

            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#9a9590' }}>
              {step === 'signup' ? (
                <>Already have an account?{' '}
                  <button onClick={() => { setStep('login'); setError(''); }} style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Sign in</button>
                </>
              ) : (
                <>New to dotball?{' '}
                  <button onClick={() => { setStep('signup'); setError(''); }} style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Create account</button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
