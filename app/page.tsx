'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  loadData, emptyData, getCurrentPhase, getPredictions, getPredictionWindow, getAverageCycleLength,
  getAveragePeriodLength, needsPeriodEnd,
  getLateInfo, isPaused, setPaused, PHASE_META, carryForward, type Phase, type BloomData,
} from '@/lib/cycle';
import { getActionItems, getActionGroups } from '@/lib/actions';
import { fetchFromSheet, sanitize } from '@/lib/data';
import { localDateStr, appDayKey } from '@/lib/day';
import { useAppDay } from '@/lib/useAppDay';
import { detectAnomalies, type Anomaly } from '@/lib/anomalies';
import { getActiveNudge, dismissNudge, type Nudge } from '@/lib/nudges';
import { isViewMode, getViewOwner, getViewOwnerName, getCachedAccountType } from '@/lib/partners';
import Hamburger from '@/components/Hamburger';
import InfoModal from '@/components/InfoModal';
import NotificationBell from '@/components/NotificationBell';
import LogoutButton from '@/components/LogoutButton';
import PeriodStartModal from '@/components/PeriodStartModal';
const LogSheet = dynamic(() => import('@/components/LogSheet'), { ssr: false });
import BloomMascot from '@/components/BloomMascot';
import AnimatedNumber from '@/components/AnimatedNumber';
import { motion } from 'motion/react';

type NotifType = 'late_period' | 'long_cycle' | 'fertile_window' | 'pms_incoming' | 'luteal_halfway' | 'logging_streak' | 'evening_refine';
const NOTIF_META: Record<NotifType, { title: string; icon: string; bg: string; border: string; iconBg: string; textColor: string }> = {
  late_period:    { title: 'Period might be late',  icon: '📅', bg: 'linear-gradient(135deg,rgba(220,38,38,0.12),rgba(157,23,77,0.07))',    border: 'rgba(220,38,38,0.30)',   iconBg: 'linear-gradient(135deg,#dc2626,#9d174d)', textColor: '#9d174d' },
  long_cycle:     { title: 'Cycle running long',    icon: '⏳', bg: 'linear-gradient(135deg,rgba(245,158,11,0.14),rgba(217,119,6,0.08))',   border: 'rgba(245,158,11,0.40)',  iconBg: 'linear-gradient(135deg,#f59e0b,#d97706)', textColor: '#b45309' },
  fertile_window: { title: 'Fertile window open',   icon: '🌸', bg: 'linear-gradient(135deg,rgba(251,191,36,0.14),rgba(165,106,189,0.08))', border: 'rgba(251,191,36,0.40)',  iconBg: 'linear-gradient(135deg,#fbbf24,#f59e0b)', textColor: '#92400e' },
  pms_incoming:   { title: 'PMS watch',             icon: '🌧️', bg: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(79,70,229,0.07))',  border: 'rgba(99,102,241,0.30)',  iconBg: 'linear-gradient(135deg,#818cf8,#6366f1)', textColor: '#4338ca' },
  luteal_halfway: { title: 'Luteal midpoint',       icon: '🌘', bg: 'linear-gradient(135deg,rgba(129,140,248,0.12),rgba(99,102,241,0.07))', border: 'rgba(129,140,248,0.30)', iconBg: 'linear-gradient(135deg,#818cf8,#a5b4fc)', textColor: '#4338ca' },
  logging_streak: { title: 'Streak at risk',        icon: '🔥', bg: 'linear-gradient(135deg,rgba(165,106,189,0.16),rgba(110,52,130,0.08))', border: 'rgba(165,106,189,0.40)', iconBg: 'linear-gradient(135deg,#A56ABD,#6E3482)', textColor: '#6E3482' },
  evening_refine: { title: 'Refine today',          icon: '🌙', bg: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(79,70,229,0.07))',  border: 'rgba(99,102,241,0.30)',  iconBg: 'linear-gradient(135deg,#818cf8,#6366f1)', textColor: '#4338ca' },
};

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
  const [loaded, setLoaded] = useState(false);
  const [dismissedAnomalies, setDismissedAnomalies] = useState<Set<string>>(new Set());
  const [nudge, setNudge] = useState<Nudge | null>(null);
  // Lazy-init from sessionStorage to avoid a one-frame flash where dismissed
  // notifications reappear before the useEffect hydration fires.
  const [dismissedNotifs, setDismissedNotifs] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const raw = sessionStorage.getItem(`bloom_notif_${appDayKey()}`);
      return raw ? new Set(raw.split(',').filter(Boolean)) : new Set();
    } catch { return new Set(); }
  });

  const todayKey = useAppDay();

  useEffect(() => {
    const u = localStorage.getItem('bloom_username');
    if (u) setUsername(u);

    // A viewer who isn't currently viewing a partner has no cycle of their own —
    // send them to Profile to accept/select a partner instead of cycle onboarding.
    if (getCachedAccountType() === 'viewer' && !getViewOwner()) {
      router.push('/profile');
      return;
    }

    const cached = sanitize(loadData());
    // Redirect new users to onboarding immediately from cache
    if (!cached.settings.onboardingComplete) {
      fetchFromSheet(getViewOwner() ?? undefined).then(d => {
        if (!d.settings.onboardingComplete) router.push('/onboarding');
        else { setData(d); setLoaded(true); }
      });
      return;
    }
    setData(cached);
    setLoaded(true);
    const { phase: cachedPhase } = getCurrentPhase(cached);
    setNudge(getActiveNudge(cached, cachedPhase));
    fetchFromSheet(getViewOwner() ?? undefined).then(d => {
      setData(d);
      const { phase: freshPhase } = getCurrentPhase(d);
      setNudge(getActiveNudge(d, freshPhase));
    });
  }, [router]);

  // Reset the focus checklist whenever the logical day changes (incl. live 5 AM rollover).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`bloom_actions_${todayKey}`);
      setDone(saved ? JSON.parse(saved) : []);
    } catch { setDone([]); }
  }, [todayKey]);

  // Load per-day dismissed notification set from sessionStorage.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`bloom_notif_${todayKey}`);
      setDismissedNotifs(raw ? new Set(raw.split(',').filter(Boolean)) : new Set());
    } catch {}
  }, [todayKey]);

  function dismissNotif(type: string) {
    setDismissedNotifs((prev) => {
      const next = new Set(prev);
      next.add(type);
      try { sessionStorage.setItem(`bloom_notif_${todayKey}`, [...next].join(',')); } catch {}
      return next;
    });
  }

  // Re-fetch when PullToRefresh fires bloom:refresh
  useEffect(() => {
    function onRefresh() {
      setData(sanitize(loadData()));
      fetchFromSheet(getViewOwner() ?? undefined).then(setData);
    }
    window.addEventListener('bloom:refresh', onRefresh);
    return () => window.removeEventListener('bloom:refresh', onRefresh);
  }, []);

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
  const goals = data.settings?.goals?.length ? data.settings.goals : (data.settings?.goal ? [data.settings.goal] : []);
  const paused = isPaused(data);
  const lateInfo = hasCycles ? getLateInfo(data) : null;
  const showPeriodEnd = phase === 'menstrual' && !paused; // show throughout menstrual phase so user can set/update end date
  const showPeriodStart = phase === 'luteal' && dayOfCycle >= 25 && !paused;
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const meta = PHASE_META[phase];

  const yesterday = (() => {
    const d = new Date(todayStr + 'T00:00:00'); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();

  // Phase 3A: predicted period end for auto-fill banner
  const predictedEndDate = (() => {
    if (!hasCycles || !needsPeriodEnd(data)) return null;
    const last = data.cycles[data.cycles.length - 1];
    const pLen = getAveragePeriodLength(data);
    const d = new Date(last.startDate + 'T00:00:00'); d.setDate(d.getDate() + pLen - 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  })();
  const showPeriodEndBanner = !paused && phase !== 'menstrual' && predictedEndDate !== null && todayStr > predictedEndDate;

  // Phase 2: smart notification card (one at a time, session-dismissible)
  const activeNotif: { type: NotifType; message: string } | null = (() => {
    if (paused || !hasCycles) return null;
    const MS_DAY = 86400000;
    const candidates: { type: NotifType; message: string }[] = [];

    if (dayOfCycle > 40 && phase !== 'menstrual')
      candidates.push({ type: 'long_cycle', message: 'Cycle running long (40+ days). Consider logging or checking in with a doctor.' });

    if (predictions && phase === 'ovulation') {
      const ovDate = new Date(predictions.ovulation);
      const day1 = new Date(ovDate); day1.setDate(ovDate.getDate() - 1);
      const day1Str = `${day1.getFullYear()}-${String(day1.getMonth()+1).padStart(2,'0')}-${String(day1.getDate()).padStart(2,'0')}`;
      if (todayStr === day1Str)
        candidates.push({ type: 'fertile_window', message: "You're in your fertile window today." });
    }

    if (predictions && predictions.daysUntilPeriod === 3)
      candidates.push({ type: 'pms_incoming', message: 'Period likely in 3 days — watch for PMS symptoms.' });

    if (predictions && phase === 'luteal') {
      const ovDate = new Date(predictions.ovulation);
      const lutealStart = new Date(ovDate); lutealStart.setDate(ovDate.getDate() + 2);
      const lutealLength = Math.round((predictions.nextPeriod.getTime() - lutealStart.getTime()) / MS_DAY);
      const todayD = new Date(todayStr + 'T00:00:00');
      const lutealDay = Math.round((todayD.getTime() - lutealStart.getTime()) / MS_DAY) + 1;
      if (lutealLength > 0 && lutealDay === Math.floor(lutealLength / 2))
        candidates.push({ type: 'luteal_halfway', message: 'Halfway through luteal phase — energy may dip. Hydrate and rest.' });
    }

    const loggedYesterday = data.logs.some(l => l.date === yesterday);
    if (!todayLog && loggedYesterday)
      candidates.push({ type: 'logging_streak', message: "Don't break your streak — log today's symptoms." });

    // Evening: invite refining today's log so it reflects how the day actually
    // went (sharpens patterns + seeds tomorrow morning's tasks).
    if (todayLog && new Date().getHours() >= 17)
      candidates.push({ type: 'evening_refine', message: 'How did today actually go? Tap your check-in to refine it.' });

    const priority: NotifType[] = ['late_period', 'long_cycle', 'fertile_window', 'pms_incoming', 'luteal_halfway', 'logging_streak', 'evening_refine'];
    for (const t of priority) {
      const c = candidates.find(x => x.type === t);
      if (c && !dismissedNotifs.has(t)) return c;
    }
    return null;
  })();
  const notifMeta = activeNotif ? NOTIF_META[activeNotif.type] : null;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() - 3 + i); return d;
  });

  const R = 50, C = 2 * Math.PI * R;
  const ringFill = hasCycles ? Math.min(dayOfCycle / avgLen, 1) : 0;
  const [c1, c2] = RING_COLORS[phase];
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // Consecutive-day logging streak (ending today; requires today's log to count).
  const streak = (() => {
    const logDates = new Set(data.logs.map(l => l.date));
    let count = 0;
    const d = new Date(todayStr + 'T00:00:00');
    while (true) {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!logDates.has(key)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  })();

  // Tasks come from phase + the day's check-in. Before today is logged, seed
  // them from yesterday's retrospective log (mood/energy/cravings/symptoms etc.)
  // so the morning isn't a blank slate — saving today's check-in refreshes them.
  const yesterdayLog = data.logs.find(l => l.date === yesterday);
  const taskLog = todayLog ?? carryForward(yesterdayLog);
  const tasksFromYesterday = !todayLog && !!taskLog;
  const actions = getActionItems(phase, taskLog, goals);
  const actionGroups = getActionGroups(phase, taskLog, goals);

  // For hero phase timeline
  const periodLen = getAveragePeriodLength(data);
  const ovDay = Math.max(periodLen + 3, avgLen - 14);
  const menstrualPct = (periodLen / avgLen) * 100;
  const follicularPct = Math.max(0, ((ovDay - periodLen - 2) / avgLen) * 100);
  const ovulationPct = (3 / avgLen) * 100;
  const lutealPct = Math.max(0, 100 - menstrualPct - follicularPct - ovulationPct);
  const progressPct = hasCycles ? Math.min((dayOfCycle / avgLen) * 100, 100) : 0;

  // Anomaly detection (client-side, session-dismissed)
  const anomalies: Anomaly[] = hasCycles ? detectAnomalies(data).filter((a) => !dismissedAnomalies.has(a.type)) : [];

  function dismissAnomaly(type: string) {
    setDismissedAnomalies((prev) => new Set([...prev, type]));
  }

  const viewMode = isViewMode();

  function refresh() {
    const d = sanitize(loadData());
    setData(d);
    fetchFromSheet(getViewOwner() ?? undefined).then((fresh) => {
      setData(fresh);
      const { phase } = getCurrentPhase(fresh);
      setNudge(getActiveNudge(fresh, phase));
    });
  }

  return (
    <div style={{ minHeight: '100dvh', padding: '0 16px' }}>

      {/* ── Header (sticky) ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        margin: '0 -16px',
        background: 'rgba(238,232,245,0.88)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderBottom: '1px solid rgba(165,106,189,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Hamburger username={username} />
          <InfoModal />
        </div>

        {/* Truly centered regardless of button widths */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#8A6A9A' }}>{greeting()},</p>
          <p style={{ margin: '1px 0 0', fontSize: 17, fontWeight: 800, color: '#1C0B2E' }}>{cap(username) || 'there'} 🌸</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <NotificationBell />
          <LogoutButton />
        </div>
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
                  <div style={{ position: 'absolute', bottom: 3, width: 6, height: 6, borderRadius: '50%', background: '#A56ABD' }} />
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
          <div
            onClick={!hasCycles && loaded ? () => router.push('/onboarding') : undefined}
            style={{ position: 'relative', flexShrink: 0, cursor: !hasCycles && loaded ? 'pointer' : 'default' }}
          >
            <svg width="120" height="120" style={{ display: 'block', transform: 'rotate(-90deg)' }}>
              <defs>
                <linearGradient id="phaseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="12" />
              <motion.circle cx="60" cy="60" r={R} fill="none" stroke="url(#phaseGrad)" strokeWidth="12"
                strokeDasharray={C} strokeLinecap="round"
                initial={{ strokeDashoffset: C }}
                animate={{ strokeDashoffset: C * (1 - ringFill) }}
                transition={{ type: 'spring', stiffness: 60, damping: 18, mass: 1 }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              {!loaded ? (
                <>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.5 }}>DAY</span>
                  <span style={{ fontSize: 30, color: '#fff', fontWeight: 800, lineHeight: 1.1, opacity: 0.35 }}>–</span>
                </>
              ) : hasCycles ? (
                <>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 0.5 }}>DAY</span>
                  <AnimatedNumber value={dayOfCycle} style={{ fontSize: 30, color: '#fff', fontWeight: 800, lineHeight: 1.1 }} />
                </>
              ) : (
                <BloomMascot size={72} />
              )}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>CURRENT PHASE</p>
            <p style={{ margin: '0 0 5px', fontSize: 18, color: '#fff', fontWeight: 800, lineHeight: 1.2 }}>{meta.emoji} {meta.label}</p>
            <p style={{ margin: '0 0 14px', fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 1.5 }}>
              {!loaded ? '' : hasCycles ? meta.description : 'Add your last period date to unlock predictions.'}
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

            {/* ── Phase timeline bar ── */}
            {hasCycles && (
              <div style={{ marginTop: 14 }}>
                <div style={{ position: 'relative', height: 7, borderRadius: 999, display: 'flex', overflow: 'visible' }}>
                  <div className="grow-bar" style={{ width: `${menstrualPct}%`,  background: '#f87171', borderRadius: '999px 0 0 999px', minWidth: 4 }} />
                  <div className="grow-bar" style={{ width: `${follicularPct}%`, background: '#a78bfa', minWidth: follicularPct > 0 ? 4 : 0 }} />
                  <div className="grow-bar" style={{ width: `${ovulationPct}%`, background: '#fbbf24', minWidth: 4 }} />
                  <div className="grow-bar" style={{ flex: 1, background: '#818cf8', borderRadius: '0 999px 999px 0', minWidth: lutealPct > 0 ? 4 : 0 }} />
                  {/* Current day marker */}
                  <div style={{
                    position: 'absolute',
                    left: `${progressPct}%`,
                    top: '50%', transform: 'translate(-50%, -50%)',
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#fff',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                    border: '2px solid rgba(255,255,255,0.9)',
                    transition: 'left .8s cubic-bezier(.34,1.2,.64,1)',
                  }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginTop: 7 }}>
                  {[
                    { label: 'Menstrual', color: '#f87171' },
                    { label: 'Follicular', color: '#a78bfa' },
                    { label: 'Ovulation', color: '#fbbf24' },
                    { label: 'Luteal', color: '#818cf8' },
                  ].map((p) => (
                    <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: 0.3 }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── Partner view-only banner ── */}
      {viewMode && (
        <div className="anim-float" style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
          padding: '12px 16px', borderRadius: 14,
          background: 'rgba(110,52,130,0.1)', border: '1px solid rgba(110,52,130,0.25)',
        }}>
          <span style={{ fontSize: 16 }}>👀</span>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#6E3482', flex: 1 }}>
            Viewing {getViewOwnerName()}’s cycle — read only. Manage in Profile.
          </p>
        </div>
      )}

      {/* ── Period end / Period started prompts ── */}
      {showPeriodEnd && !viewMode && <div className="anim-float" style={{ marginBottom: 14 }}><PeriodStartModal variant="card" label="Log period end" onDone={refresh} /></div>}
      {/* ── Phase 3A: period end auto-fill banner ── */}
      {showPeriodEndBanner && predictedEndDate && !viewMode && (
        <div className="anim-float" style={{ marginBottom: 14 }}>
          <PeriodStartModal
            variant="period-end-banner"
            estimatedEndDate={predictedEndDate}
            initialEndDate={predictedEndDate}
            endSource="computer"
            onDone={refresh}
          />
        </div>
      )}
      {showPeriodStart && !viewMode && <div className="anim-float" style={{ marginBottom: 14 }}><PeriodStartModal variant="card" label="Period started?" onDone={refresh} /></div>}

      {/* ── Late-period reminder ── */}
      {lateInfo && !viewMode && (
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

      {/* ── Phase 2: smart notification card (one at a time) ── */}
      {activeNotif && notifMeta && (
        <div className="glass-card anim-float" style={{
          position: 'relative',
          padding: '14px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          background: notifMeta.bg, borderColor: notifMeta.border,
        }}>
          <button
            onClick={() => dismissNotif(activeNotif.type)}
            className="liquid-pill"
            style={{
              position: 'absolute', top: 8, right: 8, zIndex: 2,
              width: 26, height: 26, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: '#8A6A9A', fontFamily: 'var(--font-outfit)',
            }}
            aria-label="Dismiss notification"
          >✕</button>
          <div style={{
            width: 40, height: 40, borderRadius: 14, flexShrink: 0,
            background: notifMeta.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
          }}>{notifMeta.icon}</div>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 22 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>{notifMeta.title}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: notifMeta.textColor, lineHeight: 1.4 }}>{activeNotif.message}</p>
          </div>
        </div>
      )}

      {/* ── Anomaly alerts (client-side, dismissible per session) ── */}
      {anomalies.slice(0, 1).map((a) => (
        <div key={a.type} className="glass-card anim-float" style={{
          padding: '14px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg,rgba(245,158,11,0.14),rgba(217,119,6,0.08))',
          borderColor: 'rgba(245,158,11,0.40)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg,#f59e0b,#d97706)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            boxShadow: '0 6px 16px rgba(245,158,11,0.3)',
          }}>⚠️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>{a.title}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#b45309', lineHeight: 1.4 }}>{a.message}</p>
          </div>
          <button
            onClick={() => dismissAnomaly(a.type)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A99BB5', fontSize: 16, padding: '4px 6px', flexShrink: 0, fontFamily: 'var(--font-outfit)' }}
            aria-label="Dismiss"
          >✕</button>
        </div>
      ))}

      {/* ── No-log nudge banner ── */}
      {!paused && !todayLog && !viewMode && (
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
            {streak >= 2 && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: '#A56ABD',
                background: 'rgba(165,106,189,0.12)', borderRadius: 999,
                padding: '2px 8px', marginLeft: 2,
              }}>{streak}-day streak</span>
            )}
          </div>
          {!viewMode && (
            <button onClick={() => setShowLog(true)} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px',
              fontSize: 12, fontWeight: 700, color: '#A56ABD', fontFamily: 'var(--font-outfit)',
            }}>Edit ›</button>
          )}
        </div>
      )}

      <LogSheet open={showLog} onClose={() => setShowLog(false)} onSaved={refresh} />

      {/* ── Today's focus — checkable reminders ── */}
      {!paused && (<>
      <div className="anim-rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 2px 10px' }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#1C0B2E' }}>Today&apos;s focus</p>
          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#8A6A9A' }}>
            {todayLog
              ? `${done.length}/${actions.length} done · ${meta.label} phase`
              : tasksFromYesterday
                ? 'Based on yesterday — log to refresh'
                : 'Log to get personalized tasks'}
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
                      transition: 'all .25s cubic-bezier(.22,1.12,.4,1)',
                      transform: isDone ? 'scale(1.04)' : 'scale(1)',
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

      {/* ── Feature adoption nudge ── */}
      {!paused && nudge && (
        <div className="glass-card anim-float" style={{
          padding: '14px 16px', marginBottom: 14, marginTop: 4,
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(135deg,rgba(110,52,130,0.10),rgba(165,106,189,0.06))',
          borderColor: 'rgba(165,106,189,0.30)',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg,#A56ABD,#6E3482)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            boxShadow: '0 6px 16px rgba(110,52,130,0.28)',
          }}>{nudge.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1C0B2E' }}>{nudge.title}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6E3482', lineHeight: 1.4 }}>{nudge.message}</p>
          </div>
          <button
            onClick={() => { dismissNudge(nudge.id); setNudge(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A99BB5', fontSize: 16, padding: '4px 6px', flexShrink: 0, fontFamily: 'var(--font-outfit)' }}
            aria-label="Dismiss nudge"
          >✕</button>
        </div>
      )}
    </div>
  );
}
