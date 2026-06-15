'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  loadData, getCurrentPhase, getPredictions, getAverageCycleLength,
  PHASE_META, type Phase, type BloomData,
} from '@/lib/cycle';
import { getActionItems } from '@/lib/actions';
import { fetchFromSheet } from '@/lib/data';
import { appDayKey, localDateStr } from '@/lib/day';
import Hamburger from '@/components/Hamburger';

const RING_COLORS: Record<Phase, [string, string]> = {
  menstrual:  ['#f87171', '#fca5a5'],
  follicular: ['#a78bfa', '#c4b5fd'],
  ovulation:  ['#fbbf24', '#fde68a'],
  luteal:     ['#818cf8', '#a5b4fc'],
};

const DAY_NAMES = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomePage() {
  const router = useRouter();
  const [data, setData] = useState<BloomData>({ cycles: [], logs: [] });
  const [username, setUsername] = useState('');
  const [done, setDone] = useState<number[]>([]);

  const todayKey = appDayKey(); // logical day (rolls over at 5 AM)

  useEffect(() => {
    const raw = localStorage.getItem('bloom_session');
    if (raw) { try { const { username: u } = JSON.parse(raw); setUsername(u || ''); } catch {} }
    setData(loadData());
    fetchFromSheet().then(setData);
    try {
      const saved = localStorage.getItem(`bloom_actions_${todayKey}`);
      if (saved) setDone(JSON.parse(saved));
    } catch {}
  }, [todayKey]);

  function toggleDone(i: number) {
    setDone((prev) => {
      const next = prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i];
      localStorage.setItem(`bloom_actions_${todayKey}`, JSON.stringify(next));
      return next;
    });
  }

  const today = new Date();
  const todayStr = todayKey; // today's log keyed to the logical day
  const { phase, dayOfCycle } = getCurrentPhase(data.cycles);
  const avgLen = getAverageCycleLength(data.cycles);
  const predictions = getPredictions(data.cycles);
  const meta = PHASE_META[phase];
  const todayLog = data.logs.find(l => l.date === todayStr);
  const hasCycles = data.cycles.length > 0;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 3 + i); return d;
  });

  const R = 50, C = 2 * Math.PI * R;
  const ringFill = hasCycles ? Math.min(dayOfCycle / avgLen, 1) : 0;
  const [c1, c2] = RING_COLORS[phase];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Predefined reminder-style action items based on phase + today's symptoms
  const actions = getActionItems(phase, todayLog);

  function logout() {
    localStorage.removeItem('bloom_session');
    router.replace('/login');
  }

  return (
    <div style={{ minHeight: '100vh', padding: '0 16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 14px' }}>
        <Hamburger username={username} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#8A6A9A' }}>{greeting()},</p>
          <p style={{ margin: '1px 0 0', fontSize: 17, fontWeight: 800, color: '#1C0B2E' }}>{cap(username) || 'there'} 🌸</p>
        </div>

        {/* Logout top-right */}
        <button onClick={logout} aria-label="Log out" className="liquid-pill" style={{
          width: 38, height: 38, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="#6E3482" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Month + week strip ── */}
      <p className="anim-rise" style={{ margin: '0 0 12px', textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#1C0B2E' }}>
        {MONTHS[today.getMonth()]} {today.getFullYear()}
      </p>
      <div className="anim-rise" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        {weekDays.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          const isPast = d < today && !isToday;
          const dStr = localDateStr(d);
          const hasLog = data.logs.some(l => l.date === dStr);
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 999,
                background: isToday ? 'linear-gradient(135deg,#6E3482,#49225B)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: isToday ? 700 : 500,
                color: isToday ? '#fff' : isPast ? '#C4B5D4' : '#1C0B2E',
                boxShadow: isToday ? '0 6px 16px rgba(110,52,130,0.4)' : 'none',
                position: 'relative', transition: 'all .3s cubic-bezier(.34,1.4,.64,1)',
              }}>
                {d.getDate()}
                {hasLog && !isToday && (
                  <div style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: '50%', background: '#A56ABD' }} />
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
      <div className="anim-float shimmer-host" style={{
        borderRadius: 26, padding: 20, marginBottom: 14,
        background: 'linear-gradient(135deg,#6E3482 0%,#49225B 60%,#2D0F3D 100%)',
        boxShadow: '0 14px 44px rgba(110,52,130,0.35)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <svg width="120" height="120" style={{ display: 'block', transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="phaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
              <circle cx="60" cy="60" r={R} fill="none" stroke="url(#phaseGrad)" strokeWidth="12"
                strokeDasharray={`${C * ringFill} ${C}`} strokeLinecap="round"
                style={{ transition: 'stroke-dasharray .8s cubic-bezier(.34,1.2,.64,1)' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.5 }}>DAY</span>
              <span style={{ fontSize: 30, color: '#fff', fontWeight: 800, lineHeight: 1.1 }}>{hasCycles ? dayOfCycle : '?'}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>CURRENT PHASE</p>
            <p style={{ margin: '0 0 5px', fontSize: 18, color: '#fff', fontWeight: 800, lineHeight: 1.2 }}>{meta.emoji} {meta.label}</p>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 1.5 }}>
              {hasCycles ? meta.description : 'Add your last period date to unlock predictions.'}
            </p>
            {hasCycles && predictions ? (
              <div className="pill" style={{ background: 'rgba(255,255,255,0.14)', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12 }}>🗓</span>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                  {predictions.daysUntilPeriod > 0 ? `Next period in ${predictions.daysUntilPeriod}d` : 'Period may be due'}
                </span>
              </div>
            ) : !hasCycles ? (
              <Link href="/onboarding" className="pill" style={{ display: 'inline-block', background: 'rgba(255,255,255,0.18)', padding: '7px 14px', fontSize: 12, color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
                Set up cycle →
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Today's focus — checkable reminders ── */}
      <div className="anim-rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 10px' }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>Today&apos;s focus</p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>
            {done.length}/{actions.length} done · {meta.label} phase
          </p>
        </div>
        <Link href={todayLog ? '/reports' : '/log'} style={{ fontSize: 12, fontWeight: 700, color: '#A56ABD', textDecoration: 'none' }}>
          {todayLog ? 'See report ›' : 'Log to refine ›'}
        </Link>
      </div>

      <div className="glass-card stagger" style={{ padding: '6px 8px', marginBottom: 14 }}>
        {actions.map((a, i) => {
          const isDone = done.includes(i);
          return (
            <button key={i} onClick={() => toggleDone(i)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 10px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: i < actions.length - 1 ? '1px solid rgba(165,106,189,0.12)' : 'none',
              textAlign: 'left', fontFamily: 'var(--font-outfit)',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0, opacity: isDone ? 0.45 : 1, transition: 'opacity .2s' }}>{a.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: 14, fontWeight: 700,
                  color: isDone ? '#A99BB5' : '#1C0B2E',
                  textDecoration: isDone ? 'line-through' : 'none', transition: 'all .2s',
                }}>{a.title}</p>
                <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A', textDecoration: isDone ? 'line-through' : 'none' }}>{a.sub}</p>
              </div>
              {/* Checkbox */}
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                border: isDone ? 'none' : '2px solid rgba(165,106,189,0.45)',
                background: isDone ? 'linear-gradient(135deg,#6E3482,#A56ABD)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
                transform: isDone ? 'scale(1.08)' : 'scale(1)',
                boxShadow: isDone ? '0 4px 12px rgba(110,52,130,0.35)' : 'none',
              }}>
                {isDone && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Log Today card ── */}
      <Link href="/log" style={{ textDecoration: 'none', display: 'block', marginBottom: 12 }}>
        <div className="glass-card anim-rise" style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>📝</span>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>{todayLog ? "Update today's log" : 'Log today'}</p>
                <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>{todayLog ? 'Logged ✓ — tap to edit' : 'How are you feeling?'}</p>
              </div>
            </div>
            <span style={{ fontSize: 16, color: '#A56ABD' }}>›</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
