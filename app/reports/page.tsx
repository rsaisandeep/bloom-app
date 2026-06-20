'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { loadData, getCurrentPhase, getGoals, getAveragePeriodLength, PHASE_META, type BloomData, type DayLog, type Phase } from '@/lib/cycle';
import { computeInsights, type Insights, type TrendPoint } from '@/lib/insights';
import { buildSampleData, SAMPLE_RECS } from '@/lib/sampleData';
import type { Recommendations } from '@/lib/matcher';
import { fetchFromSheet, sanitize } from '@/lib/data';
import { appDayKey } from '@/lib/day';
import TopBar from '@/components/TopBar';
const LogSheet = dynamic(() => import('@/components/LogSheet'), { ssr: false });
import AnimatedNumber from '@/components/AnimatedNumber';

// What each goal makes the report emphasise — shown as a small focus banner so
// the user can see their onboarding goals actually shape what's surfaced here.
const GOAL_FOCUS: Record<string, { emoji: string; label: string }> = {
  conceive: { emoji: '🌱', label: 'Fertile-window & ovulation signals (BBT, mucus, LH tests)' },
  symptoms: { emoji: '🩺', label: 'Symptom frequency & PMS patterns by phase' },
  track:    { emoji: '📅', label: 'Cycle length, regularity & next-period accuracy' },
  wellness: { emoji: '✨', label: 'Phase-based food, movement & sleep guidance' },
};

const REC_CARDS = [
  { key: 'food',     emoji: '🥗', label: 'Food & Nutrition', tint: 'rgba(232,248,238,0.82)', border: 'rgba(100,200,130,0.3)', color: '#166534' },
  { key: 'exercise', emoji: '🏃', label: 'Movement',         tint: 'rgba(237,233,255,0.85)', border: 'rgba(165,106,189,0.3)', color: '#4c1d95' },
  { key: 'selfcare', emoji: '💆', label: 'Self-care',        tint: 'rgba(252,232,240,0.85)', border: 'rgba(200,100,140,0.3)', color: '#9d174d' },
];

function IOSSpinner({ color = '#6E3482', size = 36 }: { color?: string; size?: number }) {
  const n = 12;
  const lineW = Math.max(2, Math.round(size * 0.085));
  const lineH = Math.round(size * 0.28);
  const topOffset = Math.round(size * 0.12);
  const pivotY = Math.round(size * 0.5 - topOffset);
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: lineW, height: lineH,
          borderRadius: lineW,
          background: color,
          top: topOffset,
          left: '50%',
          marginLeft: -lineW / 2,
          transformOrigin: `${lineW / 2}px ${pivotY}px`,
          transform: `rotate(${i * (360 / n)}deg)`,
          animation: `iosSpinner 1s ${-((n - i) / n).toFixed(3)}s linear infinite`,
        }} />
      ))}
    </div>
  );
}

function TrendChart({ points, unit, decimals = 1 }: { points: TrendPoint[]; unit: string; decimals?: number }) {
  const W = 320, H = 64, pad = 5;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const n = points.length;
  const x = (i: number) => pad + (i / (n - 1 || 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  const last = points[n - 1].value;
  const gradId = 'tg-' + unit.replace(/[^a-z]/gi, '');
  const lastLeft = (x(n - 1) / W) * 100, lastTop = (y(last) / H) * 100;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8A6A9A', marginBottom: 4 }}>
        <span>latest <strong style={{ color: '#6E3482' }}>{last.toFixed(decimals)}{unit}</strong></span>
        <span>{min.toFixed(decimals)}–{max.toFixed(decimals)}{unit}</span>
      </div>
      <div style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6E3482" stopOpacity="0.22" />
              <stop offset="1" stopColor="#6E3482" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} stroke="none" />
          <path d={line} fill="none" stroke="#6E3482" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        <span style={{
          position: 'absolute', left: `${lastLeft}%`, top: `${lastTop}%`,
          width: 8, height: 8, marginLeft: -5, marginTop: -4, borderRadius: '50%',
          background: '#6E3482', boxShadow: '0 0 0 3px rgba(110,52,130,0.18)',
        }} />
      </div>
    </div>
  );
}

function Patterns({ insights, sample }: { insights: Insights; sample?: boolean }) {
  const { cycleStats, symptoms, byPhase, correlations, loggedDays } = insights;
  const maxSym = symptoms[0]?.count ?? 1;
  const phaseRows = byPhase.filter((p) => p.count > 0);
  const { bbtTrend, weightTrend } = insights;

  return (
    <div className="anim-rise" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 800, color: '#1C0B2E' }}>Your patterns</p>
        {sample && <SampleChip />}
      </div>

      {cycleStats && (
        <>
          {/* Stat tiles */}
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Avg cycle', num: cycleStats.avg, value: `${cycleStats.avg}`, unit: 'days', color: '#6E3482' },
              { label: 'Avg period', num: cycleStats.periodAvg, value: `${cycleStats.periodAvg}`, unit: 'days', color: '#A56ABD' },
              { label: 'Regularity', value: cycleStats.irregular ? 'Irregular' : 'Regular', unit: `±${Math.round(cycleStats.stdDev)}d`, color: cycleStats.irregular ? '#B45309' : '#166534', small: true },
            ].map((t) => (
              <div key={t.label} className="glass-card" style={{ flex: 1, padding: '12px 10px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3, color: '#8A6A9A', textTransform: 'uppercase' }}>{t.label}</p>
                {typeof t.num === 'number'
                  ? <AnimatedNumber value={t.num} style={{ display: 'block', margin: 0, fontSize: 22, fontWeight: 800, color: t.color, lineHeight: 1.1 }} />
                  : <p style={{ margin: 0, fontSize: t.small ? 15 : 22, fontWeight: 800, color: t.color, lineHeight: 1.1 }}>{t.value}</p>}
                <p style={{ margin: '2px 0 0', fontSize: 10, color: '#A99BB5' }}>{t.unit}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {symptoms.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>🩹 Most common symptoms</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {symptoms.map((s) => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{s.emoji}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1C0B2E', width: 100 }}>{s.label}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 6, background: 'rgba(165,106,189,0.15)', overflow: 'hidden' }}>
                  <div className="grow-bar" style={{ width: `${(s.count / maxSym) * 100}%`, height: '100%', borderRadius: 6, background: 'linear-gradient(90deg,#A56ABD,#6E3482)' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#8A6A9A', width: 34, textAlign: 'right' }}>{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phaseRows.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 18px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>🌈 Mood &amp; energy by phase</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {phaseRows.map((p) => {
              const m = PHASE_META[p.phase];
              const pct = p.energy != null ? (p.energy / 3) * 100 : 0;
              return (
                <div key={p.phase} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{m.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1C0B2E', width: 74 }}>{m.label}</span>
                  <span style={{ flex: 1, fontSize: 12.5, color: '#6E3482', fontWeight: 600 }}>{p.topMood ?? '—'}</span>
                  <div title={p.energyLabel} style={{ width: 56, height: 8, borderRadius: 6, background: 'rgba(165,106,189,0.18)', overflow: 'hidden', flexShrink: 0 }}>
                    <div className="grow-bar" style={{ width: `${pct}%`, height: '100%', borderRadius: 6, background: 'linear-gradient(90deg,#C4A6D6,#6E3482)' }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 11, color: '#A99BB5' }}>▰ energy level · top mood per phase</p>
        </div>
      )}

      {(bbtTrend.length >= 3 || weightTrend.length >= 3) && (
        <div className="glass-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>📈 Trends</p>
          {bbtTrend.length >= 3 && (
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#6E3482' }}>🌡️ Basal body temperature</p>
              <TrendChart points={bbtTrend} unit="°C" decimals={2} />
            </div>
          )}
          {weightTrend.length >= 3 && (
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 700, color: '#6E3482' }}>⚖️ Weight</p>
              <TrendChart points={weightTrend} unit=" kg" decimals={1} />
            </div>
          )}
        </div>
      )}

      {correlations.length > 0 && (
        <div className="glass-card tint-purple" style={{ padding: '16px 18px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>What we&apos;re noticing</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {correlations.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#49225B', lineHeight: 1.5 }}>
                <span>✨</span><span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: '0 2px', fontSize: 11, color: '#A99BB5' }}>
        {sample
          ? 'Sample data shown so you can see what your reports will look like. Log a few days to replace it with your own.'
          : `From ${loggedDays} logged ${loggedDays === 1 ? 'day' : 'days'}. The more you log, the sharper these get.`}
      </p>
    </div>
  );
}

function SampleChip() {
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase',
      color: '#B45309', background: 'rgba(245,158,11,0.16)', padding: '3px 8px', borderRadius: 999,
      border: '1px solid rgba(245,158,11,0.3)',
    }}>Sample preview</span>
  );
}

function SampleBanner({ onLog }: { onLog: () => void }) {
  return (
    <div className="glass-card anim-rise" style={{
      padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
      background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)',
    }}>
      <span style={{ fontSize: 22 }}>📊</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#1C0B2E' }}>This is a sample preview</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#8A6A9A', lineHeight: 1.45 }}>
          The numbers below are example data. Log your cycle to see your own.
        </p>
      </div>
      <button onClick={onLog} style={{
        padding: '9px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0,
        background: 'linear-gradient(135deg,#6E3482,#49225B)', color: '#fff',
        fontSize: 12.5, fontWeight: 800, fontFamily: 'var(--font-outfit)',
      }}>Log now →</button>
    </div>
  );
}

// Phase-colored cycle history bars + the cycle-rhythm trend, split into a
// dedicated cycle-days chart and a period-days chart. Moved here from Calendar.
function CycleCharts({ data }: { data: BloomData }) {
  const completed = data.cycles.filter((c) => c.cycleLength && c.cycleLength >= 10);
  if (completed.length < 1) return null;
  const periodLen = getAveragePeriodLength(data);

  function phaseColor(day: number, cycLen: number, pLen: number): string {
    const ovDay = Math.max(pLen + 3, cycLen - 14);
    if (day <= pLen) return '#fca5a5';
    if (day < ovDay - 1) return '#c4b5fd';
    if (day <= ovDay + 1) return '#fde68a';
    return '#a5b4fc';
  }

  const barCycles = completed.slice(-5);
  const chartCycles = completed.filter((c) => c.periodLength).slice(-6);
  const mth = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' });
  const chartLabels = chartCycles.map((c) => mth(c.startDate));
  const cycleLens = chartCycles.map((c) => c.cycleLength!);
  const periodLens = chartCycles.map((c) => c.periodLength!);

  // Single-series line chart with its own y-scale — used for both split charts.
  function lineChart(values: number[], color: string, unit: string, dashed = false) {
    const W = 300, H = 110;
    const PAD = { l: 26, r: 30, t: 8, b: 22 };
    const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
    const yMin = Math.max(0, Math.min(...values) - 4);
    const yMax = Math.max(...values) + 4;
    const n = values.length;
    const xS = (i: number) => PAD.l + (n > 1 ? (i / (n - 1)) * iW : iW / 2);
    const yS = (v: number) => PAD.t + iH - ((v - yMin) / (yMax - yMin || 1)) * iH;
    const pts = values.map((v, i) => `${xS(i)},${yS(v)}`).join(' ');
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', overflow: 'visible' }}>
        {[yMin, Math.round((yMin + yMax) / 2), yMax].map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yS(v)} y2={yS(v)} stroke="rgba(165,106,189,0.12)" strokeWidth={1} />
            <text x={PAD.l - 4} y={yS(v) + 3.5} textAnchor="end" fill="#8A6A9A" fontSize={7.5} fontWeight={700}>{Math.round(v)}</text>
          </g>
        ))}
        <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashed ? '4 2.5' : undefined} />
        {values.map((v, i) => (<circle key={i} cx={xS(i)} cy={yS(v)} r={3.5} fill="#fff" stroke={color} strokeWidth={2} />))}
        {chartLabels.map((l, i) => (<text key={i} x={xS(i)} y={H - 4} textAnchor="middle" fill="#8A6A9A" fontSize={7.5} fontWeight={700}>{l}</text>))}
        <text x={xS(n - 1) + 5} y={yS(values[n - 1]) + 4} fill={color} fontSize={8} fontWeight={800}>{values[n - 1]}{unit}</text>
      </svg>
    );
  }

  return (
    <div className="anim-rise" style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
      {/* Cycle history — phase-colored bars per cycle */}
      <div className="glass-card" style={{ padding: '16px 18px' }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: '#1C0B2E' }}>📊 Cycle history</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {barCycles.map((c, idx) => {
            const len = c.cycleLength!;
            const pLen = c.periodLength ?? periodLen;
            const label = new Date(c.startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#8A6A9A', minWidth: 38, textAlign: 'right', flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, display: 'flex', gap: 1.5 }}>
                  {Array.from({ length: len }, (_, d) => (
                    <div key={d} style={{ flex: 1, height: 16, background: phaseColor(d + 1, len, pLen), borderRadius: d === 0 ? '4px 0 0 4px' : d === len - 1 ? '0 4px 4px 0' : 0 }} />
                  ))}
                </div>
                <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#8A6A9A', minWidth: 22, flexShrink: 0 }}>{len}d</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          {[['#fca5a5', 'Menstrual'], ['#c4b5fd', 'Follicular'], ['#fde68a', 'Ovulation'], ['#a5b4fc', 'Luteal']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontSize: '.62rem', fontWeight: 700, color: '#8A6A9A' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cycle rhythm — split into cycle-days and period-days charts */}
      {chartCycles.length >= 2 && (
        <>
          <div className="glass-card" style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 1px', fontSize: '.65rem', fontWeight: 800, color: '#8A6A9A', letterSpacing: .6, textTransform: 'uppercase' }}>Cycle days</p>
            <p style={{ margin: '0 0 10px', fontSize: '.7rem', color: '#8A6A9A' }}>Last {chartCycles.length} cycles</p>
            {lineChart(cycleLens, '#a5b4fc', 'd')}
          </div>
          <div className="glass-card" style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 1px', fontSize: '.65rem', fontWeight: 800, color: '#8A6A9A', letterSpacing: .6, textTransform: 'uppercase' }}>Period days</p>
            <p style={{ margin: '0 0 10px', fontSize: '.7rem', color: '#8A6A9A' }}>Last {chartCycles.length} cycles</p>
            {lineChart(periodLens, '#fca5a5', 'd', true)}
          </div>
        </>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [recs, setRecs] = useState<Recommendations | null>(null);
  const [phase, setPhase] = useState<Phase>('follicular');
  const [dayOfCycle, setDayOfCycle] = useState(1);
  const [data, setData] = useState<BloomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLog, setHasLog] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    function onRefresh() { setRefreshKey(k => k + 1); }
    window.addEventListener('bloom:refresh', onRefresh);
    return () => window.removeEventListener('bloom:refresh', onRefresh);
  }, []);

  async function loadRecs(log: DayLog, p: Phase) {
    // Cache key: date + phase + core symptom fields (mood/energy/cramps).
    // Rebuilds only when something meaningful changes, not on every tab visit.
    const cacheKey = `bloom_recs_${log.date}_${p}_${log.mood}_${log.energy}_${log.cramps}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setRecs(JSON.parse(cached));
        setLoading(false);
        return;
      } catch {}
    }

    const rec = await fetch('/api/recommendations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: p, log }),
    }).then((r) => r.json());

    try { localStorage.setItem(cacheKey, JSON.stringify(rec)); } catch {}
    setRecs(rec);
    setLoading(false);
  }

  function applyPhase(d: BloomData) {
    const cp = getCurrentPhase(d);
    setPhase(cp.phase); setDayOfCycle(cp.dayOfCycle);
    return cp.phase;
  }

  useEffect(() => {
    const todayStr = appDayKey();

    // Show cached data immediately — patterns render from history, no network wait.
    const cached = sanitize(loadData());
    setData(cached);
    applyPhase(cached);
    const cachedLog = cached.logs.find((l) => l.date === todayStr);

    if (!cachedLog) {
      setHasLog(false);
      setLoading(false);
      fetchFromSheet().then((d) => {
        setData(d);
        const p = applyPhase(d);
        const sheetLog = d.logs.find((l) => l.date === todayStr);
        if (sheetLog) { setHasLog(true); setLoading(true); loadRecs(sheetLog, p); }
      });
      return;
    }

    // Have a local log — show spinner, fetch fresh data + recs
    setHasLog(true);
    setRecs(null);
    fetchFromSheet().then((d) => {
      setData(d);
      const p = applyPhase(d);
      const log = d.logs.find((l) => l.date === todayStr) ?? cachedLog;
      loadRecs(log, p);
    });
  }, [refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const realInsights = useMemo(() => (data ? computeInsights(data) : null), [data]);
  const sampleData = useMemo(() => buildSampleData(), []);
  const sampleInsights = useMemo(() => computeInsights(sampleData), [sampleData]);
  const sampleMode = !realInsights?.enough;            // no real history yet → show labeled sample
  const shownInsights = sampleMode ? sampleInsights : realInsights!;
  const recsToShow: Recommendations | null = recs ?? (sampleMode ? SAMPLE_RECS : null);
  const recsLoading = loading && hasLog;               // fetching the real, today-log-based recs
  const showLogCta = !hasLog && !sampleMode;           // real history, but nothing logged today
  const meta = PHASE_META[phase as keyof typeof PHASE_META];

  if (!data) return (
    <>
      <TopBar title="Reports" />
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <IOSSpinner size={44} />
          <p style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: '#8A6A9A' }}>Building your report…</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <TopBar title="Reports" />
      <div style={{ padding: '8px 16px 24px' }}>
        <div className="anim-rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#8A6A9A' }}>Insights for {meta.label} · Day {dayOfCycle}</p>
          <span style={{ fontSize: 28 }}>{meta.emoji}</span>
        </div>

        {sampleMode && <SampleBanner onLog={() => setShowLog(true)} />}

        {/* Phase banner */}
        <div className="anim-float shimmer-host" style={{
          borderRadius: 24, padding: 18, marginBottom: 16,
          background: 'linear-gradient(135deg,#6E3482,#49225B)',
          boxShadow: '0 10px 36px rgba(110,52,130,0.30)', color: '#fff',
        }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, letterSpacing: 1, color: 'rgba(255,255,255,0.55)' }}>CURRENT PHASE</p>
          <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800 }}>{meta.emoji} {meta.label} Phase</p>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}>{recsToShow?.phaseDescription ?? meta.description}</p>
        </div>

        {(() => {
          const goals = getGoals(data.settings).filter((g) => GOAL_FOCUS[g]);
          if (!goals.length) return null;
          return (
            <div className="glass-card anim-rise" style={{ padding: '12px 16px', marginBottom: 16 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: '#A56ABD' }}>
                Tailored to your goals
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {goals.map((g) => (
                  <div key={g} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#49225B', lineHeight: 1.45 }}>
                    <span>{GOAL_FOCUS[g].emoji}</span><span>{GOAL_FOCUS[g].label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <Patterns insights={shownInsights} sample={sampleMode} />

        <CycleCharts data={sampleMode ? sampleData : data} />

        {/* Recommendation cards — real (today's log), sample, a loading spinner, or a log-CTA */}
        {recsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}><IOSSpinner size={32} /></div>
        ) : showLogCta ? (
          <div className="glass-card anim-rise" style={{ padding: '18px 18px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color: '#A56ABD', textTransform: 'uppercase' }}>Recommendations</p>
            <p style={{ margin: '0 0 12px', fontSize: 14.5, fontWeight: 800, color: '#1C0B2E', lineHeight: 1.5 }}>Log today's check-in to get personalized recommendations.</p>
            <button onClick={() => setShowLog(true)} style={{
              padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#6E3482,#49225B)', color: '#fff',
              fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-outfit)',
            }}>Log now →</button>
          </div>
        ) : recsToShow && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 10px' }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1C0B2E' }}>Recommendations</p>
              {sampleMode && <SampleChip />}
            </div>
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {REC_CARDS.map(({ key, emoji, label, tint, border, color }) => {
                const d = recsToShow[key as keyof Recommendations] as { text: string; science: string };
                return (
                  <div key={key} className="glass-card" style={{ background: tint, borderColor: border, padding: '14px 16px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 800, letterSpacing: 0.6, color, textTransform: 'uppercase' }}>
                      {emoji} {label}
                    </p>
                    <p style={{ margin: '0 0 8px', fontSize: 14.5, fontWeight: 800, color: '#1C0B2E', lineHeight: 1.5 }}>{d.text}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6E3482', lineHeight: 1.55, fontStyle: 'italic' }}>{d.science}</p>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <Link href="/read" style={{ textDecoration: 'none' }}>
          <div className="glass-card tint-purple anim-rise" style={{ padding: '14px 18px', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>📖</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1C0B2E' }}>Learn more about the {meta.label} phase</span>
            </div>
            <span style={{ color: '#A56ABD' }}>›</span>
          </div>
        </Link>
      </div>
      <LogSheet open={showLog} onClose={() => setShowLog(false)} onSaved={() => { setShowLog(false); setRefreshKey((k) => k + 1); }} />
    </>
  );
}
