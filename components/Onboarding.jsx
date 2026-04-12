'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

const SLIDES = [
  {
    icon: '🏏',
    title: 'Welcome to dotball',
    body: 'IPL 2026 fantasy with friends and family.\nNo money involved — just cricket knowledge.',
    gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  },
  {
    icon: '⚡',
    title: 'Two formats',
    body: 'Classic XI — pick 11 players within a 100-credit budget.\n\nTop 3 — predict your top 3 run scorers.',
    gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
  },
  {
    icon: '🔒',
    title: 'Squads stay secret',
    body: "Nobody sees your picks until the\nvery first ball is bowled.\nPure skill wins.",
    gradient: 'linear-gradient(135deg,#22c55e,#06b6d4)',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { finishOnboarding } = useAuth();
  const slide = SLIDES[step];

  const next = () => {
    if (step < 2) setStep(s => s + 1);
    else finishOnboarding();
  };

  return (
    <div style={{
      height: '100vh', background: '#08090f', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '28px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 22 }}>{slide.icon}</div>
      <div style={{ fontSize: 23, fontWeight: 700, color: '#eef0ff', marginBottom: 12, lineHeight: 1.2 }}>
        {slide.title}
      </div>
      <div style={{ fontSize: 14, color: '#7a85a0', marginBottom: 30, lineHeight: 1.85, whiteSpace: 'pre-line' }}>
        {slide.body}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            height: 4, borderRadius: 99,
            background: i === step ? '#6366f1' : '#1c2035',
            width: i === step ? 28 : 10,
            transition: 'all .3s',
          }} />
        ))}
      </div>

      <button
        onClick={next}
        style={{
          width: '100%', maxWidth: 300, padding: 15, borderRadius: 14, border: 'none',
          background: slide.gradient, color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
        }}
      >
        {step < 2 ? 'Next' : 'Get started'}
      </button>

      {step < 2 && (
        <button
          onClick={finishOnboarding}
          style={{ marginTop: 13, background: 'transparent', border: 'none', color: '#424960', fontSize: 12, cursor: 'pointer' }}
        >
          Skip
        </button>
      )}
    </div>
  );
}
