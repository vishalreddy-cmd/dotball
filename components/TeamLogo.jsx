import data from '@/data/squads.json';

const T = data.teams;

export default function TeamLogo({ team, size = 44 }) {
  const t = T[team];
  if (!t) return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#1c2035', flexShrink: 0 }} />
  );
  const fs = size <= 22
    ? Math.round(size * 0.34)
    : size <= 34
      ? Math.round(size * 0.30)
      : Math.round(size * 0.26);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: t.bg, color: t.tc,
      fontSize: fs, fontWeight: 900,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, letterSpacing: '-0.5px',
      border: `2px solid ${t.tc}33`,
    }}>
      {team}
    </div>
  );
}
