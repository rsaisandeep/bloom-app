'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  loadData, emptyData, getCurrentPhase, getPredictions, getPredictionWindow, getAverageCycleLength,
  getLateInfo, isPaused, setPaused, PHASE_META, type Phase, type BloomData,
} from '@/lib/cycle';
import { getActionItems, getActionGroups } from '@/lib/actions';
import { fetchFromSheet, sanitize } from '@/lib/data';
import { localDateStr } from '@/lib/day';
import { useAppDay } from '@/lib/useAppDay';
import Hamburger from '@/components/Hamburger';
import InfoModal from '@/components/InfoModal';
import PeriodStartModal from '@/components/PeriodStartModal';
import LogSheet from '@/components/LogSheet';

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
  const [data, setData] = useState<BloomData>(emptyData);
  const [username, setUsername] = useState('');
  const [done, setDone] = useState<number[]>([]);
  const [showLog, setShowLog] = useState(false);

  const todayKey = useAppDay();

  useEffect(() => {
    const u = localStorage.getItem('bloom_username');
    if (u) setUsername(u);

    const cached = sanitize(loadData());
    // Redirect new users to onboarding immediately from cache
    if (!cached.settings.onboardingComplete) {
      fetchFromSheet().then(d => {
        if (!d.settings.onboardingComplete) router.push('/onboarding');
        else setData(d);
      });
      return;
    }
    setData(cached);
    fetchFromSheet().then(setData);
  }, [router]);

  // Reset the focus checklist whenever the logical day changes (incl. live 5 AM rollover).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bloom_actions_${todayKey}`);
      setDone(saved ? JSON.parse(saved) : []);
    } catch { setDone([]); }
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
  const hasCycles = data.cycles.length > 0;
  const todayLog = data.logs.find(l => l.date === todayStr);
  const { phase, dayOfCycle } = getCurrentPhase(data);
  const avgLen = getAverageCycleLength(data);
  const predictions = getPredictions(data);
  const pcosMode = !!data.settings?.pcosMode;
  const predWindow = pcosMode ? getPredictionWindow(data) : null;
  const paused = isPaused(data);
  const lateInfo = hasCycles ? getLateInfo(data) : null;
  const showPeriodEnd = phase === 'menstrual' && !paused; // show throughout menstrual phase so user can set/update end date
  const showPeriodStart = phase === 'luteal' && dayOfCycle >= 25 && !paused;
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const meta = PHASE_META[phase];

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 3 + i); return d;
  });

  const R = 50, C = 2 * Math.PI * R;
  const ringFill = hasCycles ? Math.min(dayOfCycle / avgLen, 1) : 0;
  const [c1, c2] = RING_COLORS[phase];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Predefined reminder-style action items based on phase + today's symptoms,
  // grouped by what each task targets (a check-in symptom, fertility, or phase).
  const actions = getActionItems(phase, todayLog);
  const actionGroups = getActionGroups(phase, todayLog);

  function refresh() { setData(sanitize(loadData())); fetchFromSheet().then(setData); }

  return (
    <div style={{ minHeight: '100vh', padding: '0 16px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0 14px' }}>
        <Hamburger username={username} />

        <div style={{ textAlign: 'center', flex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#8A6A9A' }}>{greeting()},</p>
          <p style={{ margin: '1px 0 0', fontSize: 17, fontWeight: 800, color: '#1C0B2E' }}>{cap(username) || 'there'} 🌸</p>
        </div>

        {/* Info top-right */}
        <InfoModal />
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

      {/* ── Paused state ── */}
      {paused && (
        <div className="glass-card anim-float" style={{ padding: 22, marginBottom: 14, textAlign: 'center' }}>
          <div style={{ fontSize: 38, marginBottom: 8 }}>⏸️</div>
          <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1C0B2E' }}>Tracking paused</p>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8A6A9A', lineHeight: 1.55 }}>
            Predictions and reminders are off. Log a period anytime, or resume to pick tracking back up.
          </p>
          <button onClick={() => { setPaused(false); refresh(); }} style={{
            padding: '11px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#6E3482,#A56ABD)', color: '#fff',
            fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-outfit)',
            boxShadow: '0 6px 20px rgba(110,52,130,0.35)',
          }}>Resume tracking</button>
        </div>
      )}

      {/* ── Cycle status card ── */}
      {!paused && (
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
              <div className="pill" style={{ background: 'rgba(255,255,255,0.14)', padding: '7px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
                <span style={{ fontSize: 12 }}>🗓</span>
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                  {pcosMode && predWindow
                    ? `Period likely ${fmt(predWindow.early)} – ${fmt(predWindow.late)}`
                    : predictions.daysUntilPeriod > 0
                      ? predictions.uncertainty > 0
                        ? `Next period in ${Math.max(predictions.daysUntilPeriod - predictions.uncertainty, 0)}–${predictions.daysUntilPeriod + predictions.uncertainty}d`
                        : `Next period in ${predictions.daysUntilPeriod}d`
                      : 'Period may be due'}
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
      )}

      {/* ── Period end / Period started prompts ── */}
      {showPeriodEnd && <div className="anim-float" style={{ marginBottom: 14 }}><PeriodStartModal variant="card" label="Log period end" onDone={refresh} /></div>}
      {showPeriodStart && <div className="anim-float" style={{ marginBottom: 14 }}><PeriodStartModal variant="card" label="Period started?" onDone={refresh} /></div>}

      {/* ── Late-period reminder ── */}
      {lateInfo && (
        <div className="glass-card anim-float shimmer-host" style={{
          padding: '14px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg, rgba(220,38,38,0.14), rgba(157,23,77,0.08))',
          borderColor: 'rgba(220,38,38,0.35)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg,#dc2626,#9d174d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            boxShadow: '0 6px 16px rgba(220,38,38,0.3)',
          }}>🩸</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>
              Period {lateInfo.daysLate} {lateInfo.daysLate === 1 ? 'day' : 'days'} late
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9d174d', lineHeight: 1.4 }}>
              {lateInfo.suggestPause
                ? 'Very overdue. Pause tracking if pregnant or on a break.'
                : pcosMode ? 'Normal with PCOS — log it once it starts.' : 'Tap when it starts so predictions stay accurate.'}
            </p>
            {lateInfo.suggestPause && (
              <button onClick={() => { setPaused(true); refresh(); }} style={{
                marginTop: 6, background: 'rgba(217,119,6,0.14)', border: 'none', borderRadius: 999,
                padding: '5px 12px', fontSize: 11, fontWeight: 800, color: '#b45309', cursor: 'pointer',
                fontFamily: 'var(--font-outfit)',
              }}>⏸️ Pause tracking</button>
            )}
          </div>
          <PeriodStartModal variant="banner-cta" onDone={refresh} />
        </div>
      )}

      {/* ── No-log nudge banner ── */}
      {!paused && !todayLog && (
        <button onClick={() => setShowLog(true)} style={{ width: '100%', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'block', marginBottom: 14 }}>
          <div className="glass-card anim-float shimmer-host" style={{
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'linear-gradient(135deg, rgba(165,106,189,0.18), rgba(110,52,130,0.10))',
            borderColor: 'rgba(165,106,189,0.4)',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg,#6E3482,#A56ABD)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
              boxShadow: '0 6px 16px rgba(110,52,130,0.35)',
            }}>📝</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>No log entered today</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E3482', lineHeight: 1.4 }}>
                Log how you feel to get tasks tailored to your symptoms.
              </p>
            </div>
            <span style={{
              fontSize: 12, fontWeight: 800, color: '#fff', flexShrink: 0,
              padding: '8px 14px', borderRadius: 999,
              background: 'linear-gradient(135deg,#6E3482,#49225B)',
              boxShadow: '0 4px 12px rgba(110,52,130,0.3)',
            }}>Log →</span>
          </div>
        </button>
      )}

      {/* ── Logged today indicator ── */}
      {!paused && todayLog && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15 }}>✅</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#6E3482' }}>Logged today</span>
          </div>
          <button onClick={() => setShowLog(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px',
            fontSize: 12, fontWeight: 700, color: '#A56ABD', fontFamily: 'var(--font-outfit)',
          }}>Edit ›</button>
        </div>
      )}

      <LogSheet open={showLog} onClose={() => setShowLog(false)} onSaved={refresh} />

      {/* ── Today's focus — checkable reminders ── */}
      {!paused && (<>
      <div className="anim-rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 10px' }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>Today&apos;s focus</p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>
            {todayLog ? `${done.length}/${actions.length} done · ${meta.label} phase` : 'Log to get personalized tasks'}
          </p>
        </div>
        {todayLog && (
          <Link href="/reports" style={{ fontSize: 12, fontWeight: 700, color: '#A56ABD', textDecoration: 'none' }}>
            See report ›
          </Link>
        )}
      </div>

      {(() => { let flatIdx = -1; return (
        actionGroups.map((g) => (
          <div key={g.group} style={{ marginBottom: 14 }}>
            <p style={{
              margin: '0 0 6px 4px', fontSize: 11, fontWeight: 800, letterSpacing: 0.6,
              textTransform: 'uppercase', color: '#A56ABD',
            }}>{g.group}</p>
            <div className="glass-card stagger" style={{ padding: '6px 8px' }}>
              {g.items.map((a, j) => {
                const i = ++flatIdx;
                const isDone = done.includes(i);
                return (
                  <button key={i} onClick={() => toggleDone(i)} style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 10px', background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: j < g.items.length - 1 ? '1px solid rgba(165,106,189,0.12)' : 'none',
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
          </div>
        ))
      ); })()}
      </>)}
    </div>
  );
}
