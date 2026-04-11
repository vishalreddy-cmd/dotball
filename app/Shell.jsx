'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Onboarding from '@/components/Onboarding';
import AuthScreen from '@/components/AuthScreen';
import NavBar from '@/components/NavBar';
import NotifPrompt from '@/components/NotifPrompt';
import { usePush } from '@/lib/usePush';

export default function Shell({ children }) {
  const { user, profile, avatar, obDone, loading } = useAuth();
  const { theme, toggle, t } = useTheme();
  usePush(user?.uid);
  const pathname = usePathname();
  const router   = useRouter();

  /* Loading splash */
  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, zIndex: 999 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: t.text, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#6366f1' }} />
          dotball
        </div>
        <div style={{ fontSize: 12, color: t.text3 }}>IPL 2026 fantasy</div>
      </div>
    );
  }

  /* Onboarding */
  if (!obDone) return <Onboarding />;

  /* Auth gate */
  if (!user) return <AuthScreen />;

  /* App shell */
  const isPlay   = pathname.startsWith('/play/');
  const initials = (profile?.name || '?').substring(0, 2).toUpperCase();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto', position: 'relative', background: t.bg }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 10px',
        background: t.bg,
        borderBottom: `1px solid ${t.border}`,
        flexShrink: 0,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }}>
        {/* Left: back arrow (play pages) or logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isPlay && (
            <button
              onClick={() => router.back()}
              style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}
            >
              ←
            </button>
          )}
          <div style={{ fontSize: 19, fontWeight: 900, color: t.text, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
            dotball
          </div>
        </div>

        {/* Right: live badge + theme toggle + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Live badge */}
          <div style={{ fontSize: 8, padding: '3px 8px', borderRadius: 99, background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="blink">●</span> Live
          </div>

          {/* Theme toggle — pill switch */}
          <button
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{
              position: 'relative',
              width: 48, height: 26,
              borderRadius: 99,
              border: theme === 'dark' ? '1px solid #252a40' : '1px solid #b8ad9e',
              background: theme === 'dark' ? '#1c2035' : '#c8bfb0',
              cursor: 'pointer', flexShrink: 0, padding: 0,
              transition: 'background 0.25s ease, border-color 0.25s ease',
            }}
          >
            {/* sliding knob */}
            <span style={{
              position: 'absolute',
              top: 3,
              left: theme === 'dark' ? 3 : 23,
              width: 20, height: 20,
              borderRadius: '50%',
              background: theme === 'dark' ? '#424960' : '#fdfaf5',
              boxShadow: '0 1px 4px #0004',
              transition: 'left 0.22s cubic-bezier(0.4,0,0.2,1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11,
            }}>
              {theme === 'dark' ? '🌙' : '☀️'}
            </span>
          </button>

          {/* Avatar */}
          <button
            onClick={() => router.push('/profile')}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              border: '2px solid #6366f133',
              overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff', padding: 0,
            }}
          >
            {avatar
              ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : initials}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main
        className="scroll-area"
        style={{
          flex: 1,
          paddingBottom: isPlay
            ? 'max(16px, env(safe-area-inset-bottom))'
            : 'max(72px, calc(72px + env(safe-area-inset-bottom)))',
        }}
      >
        {children}
      </main>

      {/* Bottom nav (hidden on play pages) */}
      {!isPlay && <NavBar />}
      <NotifPrompt uid={user?.uid} />
    </div>
  );
}
