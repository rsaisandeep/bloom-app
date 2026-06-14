'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  loadData, getCurrentPhase, getPredictions, getAverageCycleLength,
  PHASE_META, type Phase, type BloomData,
} from '@/lib/cycle';

const RING_COLORS: Record<Phase, [string, string]> = {
  menstrual:  ['#f87171', '#fca5a5'],
  follicular: ['#a78bfa', '#c4b5fd'],
  ovulation:  ['#fbbf24', '#fde68a'],
  luteal:     ['#818cf8', '#a5b4fc'],
};

const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function HomePage() {
  const [data, setData] = useState<BloomData>({ cycles: [], logs: [] });
  const [username, setUsername] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem('bloom_session');
    if (raw) { try { const { username: u } = JSON.parse(raw); setUsername(u || ''); } catch {} }
    setData(loadData());
  }, []);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const { phase, dayOfCycle } = getCurrentPhase(data.cycles);
  const avgLen = getAverageCycleLength(data.cycles);
  const predictions = getPredictions(data.cycles);
  const meta = PHASE_META[phase];
  const todayLog = data.logs.find(l => l.date === todayStr);
  const hasCycles = data.cycles.length > 0;

  // Week strip: 3 days before, today, 3 after
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 3 + i); return d;
  });

  // Phase ring
  const R = 50, C = 2 * Math.PI * R;
  const ringFill = hasCycles ? Math.min(dayOfCycle / avgLen, 1) : 0;
  const [c1, c2] = RING_COLORS[phase];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div style={{ minHeight: '100vh', padding: '0 16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 14px' }}>
        {/* Hamburger */}
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[0,1,2].map(i => <div key={i} style={{ width: 20, height: 2, background: '#1C0B2E', borderRadius: 2 }} />)}
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#8A6A9A' }}>Welcome back,</p>
          <p style={{ margin: '1px 0 0', fontSize: 16, fontWeight: 800, color: '#1C0B2E' }}>{cap(username) || 'there'}!</p>
        </div>

        {/* Avatar */}
        <Link href="/profile" style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800, color: '#fff', textDecoration: 'none',
          boxShadow: '0 4px 12px rgba(110,52,130,0.30)',
        }}>
          {username?.[0]?.toUpperCase() || '🌸'}
        </Link>
      </div>

      {/* ── Month label ── */}
      <p style={{ margin: '0 0 12px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#1C0B2E' }}>
        {MONTHS[today.getMonth()]} {today.getFullYear()}
      </p>

      {/* ── Week strip ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const isPast = d < today && !isToday;
          const dStr = d.toISOString().split('T')[0];
          const hasLog = data.logs.some(l => l.date === dStr);
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: isToday ? '#1C0B2E' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: isToday ? 700 : 500,
                color: isToday ? '#fff' : isPast ? '#C4B5D4' : '#1C0B2E',
                position: 'relative',
              }}>
                {d.getDate()}
                {hasLog && !isToday && (
                  <div style={{ position: 'absolute', bottom: 2, width: 4, height: 4, borderRadius: '50%', background: '#A56ABD' }} />
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: isToday ? 700 : 500, color: isToday ? '#6E3482' : '#9CA3AF', letterSpacing: 0.3 }}>
                {DAY_NAMES[d.getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Cycle status card ── */}
      <div style={{
        borderRadius: 24, padding: '20px', marginBottom: 14,
        background: 'linear-gradient(135deg,#6E3482 0%,#49225B 60%,#2D0F3D 100%)',
        boxShadow: '0 12px 40px rgba(110,52,130,0.35)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* shimmer overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,rgba(255,255,255,0.10) 0%,transparent 55%)', pointerEvents: 'none', borderRadius: 'inherit' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Ring */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="120" height="120" style={{ display: 'block', transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="phaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={c1} />
                  <stop offset="100%" stopColor={c2} />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
              <circle cx="60" cy="60" r={R} fill="none" stroke="url(#phaseGrad)" strokeWidth="12"
                strokeDasharray={`${C * ringFill} ${C}`} strokeLinecap="round" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.5 }}>DAY</span>
              <span style={{ fontSize: 30, color: '#fff', fontWeight: 800, lineHeight: 1.1 }}>
                {hasCycles ? dayOfCycle : '?'}
              </span>
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>CURRENT PHASE</p>
            <p style={{ margin: '0 0 5px', fontSize: 18, color: '#fff', fontWeight: 800, lineHeight: 1.2 }}>
              {meta.emoji} {meta.label}
            </p>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 1.5 }}>
              {hasCycles ? meta.description : 'Add your last period date to unlock predictions.'}
            </p>
            {hasCycles && predictions ? (
              <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '7px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>🗓</span>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                  {predictions.daysUntilPeriod > 0 ? `Next period in ${predictions.daysUntilPeriod}d` : 'Period may be due'}
                </span>
              </div>
            ) : !hasCycles ? (
              <Link href="/onboarding" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', borderRadius: 10, padding: '7px 14px', fontSize: 12, color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
                Set up cycle →
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Quick stats ── */}
      {hasCycles && predictions && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div className="glass-card" style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#8A6A9A', letterSpacing: 0.8, textTransform: 'uppercase' }}>NEXT CYCLE</p>
            <p style={{ margin: '0 0 2px', fontSize: 24, fontWeight: 800, color: '#6E3482' }}>{Math.max(predictions.daysUntilPeriod, 0)}d</p>
            <p style={{ margin: 0, fontSize: 11, color: '#8A6A9A' }}>
              {predictions.nextPeriod.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="glass-card" style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#8A6A9A', letterSpacing: 0.8, textTransform: 'uppercase' }}>VITAL SIGNS</p>
            <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>Normal</p>
            <p style={{ margin: 0, fontSize: 11, color: '#8A6A9A' }}>You're in {meta.label} phase</p>
          </div>
        </div>
      )}

      {/* ── Log Today card ── */}
      <Link href="/log" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: todayLog ? 10 : 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>📝</span>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>{todayLog ? "Today's Log" : 'Log Today'}</p>
                {!todayLog && <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>How are you feeling?</p>}
              </div>
            </div>
            <span style={{ fontSize: 16, color: '#A56ABD' }}>›</span>
          </div>
          {todayLog ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {([
                { emoji: '🩸', val: todayLog.flow },
                { emoji: '😊', val: todayLog.mood },
                { emoji: '⚡', val: todayLog.energy },
                { emoji: '💊', val: todayLog.cramps },
              ] as { emoji: string; val: string | undefined }[]).filter(x => x.val && x.val !== 'none').map((x, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 600, color: '#6E3482', background: 'rgba(110,52,130,0.08)', borderRadius: 8, padding: '4px 10px' }}>
                  {x.emoji} {x.val}
                </span>
              ))}
              {!todayLog.flow || todayLog.flow === 'none' ? (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#8A6A9A', background: 'rgba(138,106,154,0.08)', borderRadius: 8, padding: '4px 10px' }}>✓ Logged today</span>
              ) : null}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: '#8A6A9A', lineHeight: 1.5 }}>
              Track symptoms for personalized insights →
            </p>
          )}
        </div>
      </Link>

      {/* ── Insights card ── */}
      <Link href="/insights" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
        <div className="glass-card tint-purple" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>✨</span>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>Your Insights</p>
                <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>
                  Personalized for {hasCycles ? `${meta.label} phase` : 'you'}
                </p>
              </div>
            </div>
            <span style={{ fontSize: 16, color: '#A56ABD' }}>›</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {['🥗 Food', '🏃 Exercise', '💆 Self-care'].map(label => (
              <span key={label} style={{ fontSize: 11, fontWeight: 600, color: '#6E3482', background: 'rgba(110,52,130,0.08)', borderRadius: 8, padding: '4px 10px' }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </Link>

    </div>
  );
}
