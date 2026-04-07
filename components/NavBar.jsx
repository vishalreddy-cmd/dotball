'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const TABS = [
  { id: 'home',    href: '/',        icon: '🏏', label: 'Matches'  },
  { id: 'boards',  href: '/boards',  icon: '🏆', label: 'Rankings' },
  { id: 'squads',  href: '/squads',  icon: '👑', label: 'Squads'   },
  { id: 'groups',  href: '/groups',  icon: '🤝', label: 'Groups'   },
  { id: 'profile', href: '/profile', icon: '👤', label: 'Profile'  },
];

export default function NavBar() {
  const pathname   = usePathname();
  const { challenges } = useAuth();
  const grpBadge   = challenges.length > 0; // simple badge indicator

  const active = (href) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav style={{
      display: 'flex', background: '#08090f',
      borderTop: '1px solid #1c2035', flexShrink: 0,
      paddingBottom: 'max(6px, env(safe-area-inset-bottom))',
    }}>
      {TABS.map(({ id, href, icon, label }) => {
        const on = active(href);
        const badge = id === 'groups' && grpBadge;
        return (
          <Link
            key={id}
            href={href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '9px 4px 6px', textDecoration: 'none',
              position: 'relative', WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: 17, lineHeight: 1 }}>{icon}</span>
            <span style={{ fontSize: 8, color: on ? '#6366f1' : '#424960', fontWeight: on ? 700 : 400 }}>
              {label}
            </span>
            {on && (
              <span style={{
                display: 'block', width: 14, height: 2, borderRadius: 99,
                background: '#6366f1', marginTop: 1,
              }} />
            )}
            {badge && (
              <span style={{
                position: 'absolute', top: 5, right: 8, width: 8, height: 8,
                borderRadius: '50%', background: '#ef4444', border: '1.5px solid #08090f',
              }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
